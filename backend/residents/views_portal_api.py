import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .forms import DocumentRequestForm, ResidentRegistrationForm
from .models import DocumentRequest, Resident


def _linked_resident(user):
    email = (user.email or "").strip()
    if email:
        resident = Resident.objects.filter(email__iexact=email, is_active=True).first()
        if resident:
            return resident

    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
    if first_name and last_name:
        return Resident.objects.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            is_active=True,
        ).first()

    return None


def _my_requests(user):
    email = (user.email or "").strip()
    full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()

    queryset = DocumentRequest.objects.none()
    if email:
        queryset = queryset | DocumentRequest.objects.filter(email__iexact=email)
    if full_name:
        queryset = queryset | DocumentRequest.objects.filter(full_name__iexact=full_name)

    return queryset.order_by("-created_at")


@require_POST

def portal_register_api(request):
    form = ResidentRegistrationForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"errors": form.errors}, status=400)

    user = form.save()
    return JsonResponse(
        {
            "detail": "Registration successful.",
            "username": user.username,
            "email": user.email,
        },
        status=201,
    )


@require_GET
@login_required

def portal_dashboard_api(request):
    resident = _linked_resident(request.user)
    requests = _my_requests(request.user)

    return JsonResponse(
        {
            "user": {
                "username": request.user.username,
                "full_name": request.user.get_full_name(),
                "email": request.user.email,
            },
            "resident": {
                "id": resident.id,
                "full_name": resident.full_name,
                "zone": resident.zone,
                "contact_number": resident.contact_number,
            }
            if resident
            else None,
            "counts": {
                "total_requests": requests.count(),
                "pending_requests": requests.filter(status__in=["pending", "processing"]).count(),
                "ready_requests": requests.filter(status="ready_for_pickup").count(),
            },
        }
    )


@require_GET
@login_required

def portal_requests_api(request):
    requests = _my_requests(request.user)

    return JsonResponse(
        {
            "results": [
                {
                    "tracking_number": doc.tracking_number,
                    "full_name": doc.full_name,
                    "document_type": doc.document_type,
                    "status": doc.status,
                    "created_at": doc.created_at.isoformat(),
                }
                for doc in requests[:100]
            ]
        }
    )


@require_POST
@login_required

def portal_request_create_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON payload."}, status=400)

    form = DocumentRequestForm(payload)
    if not form.is_valid():
        return JsonResponse({"errors": form.errors}, status=400)

    document_request = form.save(commit=False)
    document_request.submitted_by = request.user
    if not document_request.email:
        document_request.email = (request.user.email or "").strip()
    if not document_request.full_name.strip():
        document_request.full_name = request.user.get_full_name() or request.user.username
    document_request.save()

    return JsonResponse(
        {
            "tracking_number": document_request.tracking_number,
            "status": document_request.status,
        },
        status=201,
    )
