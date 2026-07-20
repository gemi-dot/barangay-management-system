import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .forms import DocumentRequestForm, ResidentRegistrationForm
from .models import DocumentRequest, Resident


def _linked_resident(user):
    return Resident.objects.filter(portal_user=user, is_active=True).first()


def _my_requests(user):
    return DocumentRequest.objects.filter(submitted_by=user).order_by("-created_at")


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
