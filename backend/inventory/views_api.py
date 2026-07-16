from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Asset


def _staff_guard(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if not user.is_staff:
        return JsonResponse({"detail": "Staff access is required."}, status=403)
    return None


@require_GET
@login_required

def inventory_summary_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    assets = Asset.objects.all()
    by_status = dict(assets.values_list("status").annotate(total=Count("id")))

    top_categories = list(
        assets.values("category__name")
        .annotate(total=Count("id"))
        .order_by("-total", "category__name")[:8]
    )

    top_locations = list(
        assets.values("location")
        .annotate(total=Count("id"))
        .order_by("-total", "location")[:8]
    )

    return JsonResponse(
        {
            "total_assets": assets.count(),
            "active_assets": by_status.get("active", 0),
            "under_repair_assets": by_status.get("under_repair", 0),
            "lost_assets": by_status.get("lost", 0),
            "disposed_assets": by_status.get("disposed", 0),
            "top_categories": top_categories,
            "top_locations": top_locations,
        }
    )


@require_GET
@login_required

def inventory_assets_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    q = request.GET.get("q", "").strip()
    status = request.GET.get("status", "").strip()
    page_raw = request.GET.get("page", "1").strip()
    page_size_raw = request.GET.get("page_size", "20").strip()

    try:
        page = max(1, int(page_raw))
    except ValueError:
        page = 1

    try:
        page_size = int(page_size_raw)
    except ValueError:
        page_size = 20
    page_size = min(max(page_size, 1), 100)

    assets = Asset.objects.select_related("category").order_by("property_number")

    if q:
        assets = assets.filter(
            Q(property_number__icontains=q)
            | Q(description__icontains=q)
            | Q(category__name__icontains=q)
            | Q(serial_number__icontains=q)
            | Q(location__icontains=q)
        )

    if status:
        assets = assets.filter(status=status)

    paginator = Paginator(assets, page_size)
    page_obj = paginator.get_page(page)

    results = [
        {
            "id": asset.id,
            "property_number": asset.property_number,
            "description": asset.description,
            "category": asset.category.get_name_display(),
            "status": asset.status,
            "condition": asset.condition,
            "location": asset.location,
            "date_acquired": asset.date_acquired.isoformat() if asset.date_acquired else None,
        }
        for asset in page_obj.object_list
    ]

    return JsonResponse(
        {
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": results,
        }
    )
