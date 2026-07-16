from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Household, Resident


def _staff_guard(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if not user.is_staff:
        return JsonResponse({"detail": "Staff access is required."}, status=403)
    return None


@require_GET
@login_required
def households_summary_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    households = Household.objects.select_related("household_head")
    total_households = households.count()

    zone_counts = {}
    for row in households.values_list("household_head__zone", flat=True):
        zone = row or "Unassigned"
        zone_counts[zone] = zone_counts.get(zone, 0) + 1

    by_zone = [
        {"zone": zone, "total": total}
        for zone, total in sorted(zone_counts.items(), key=lambda item: item[0])
    ]

    return JsonResponse(
        {
            "total_households": total_households,
            "total_residents": Resident.objects.filter(is_active=True).count(),
            "by_zone": by_zone,
        }
    )


@require_GET
@login_required
def households_list_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    q = request.GET.get("q", "").strip()
    zone = request.GET.get("zone", "").strip()

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

    households = Household.objects.select_related("household_head").prefetch_related("members").order_by(
        "household_number"
    )

    if zone:
        households = households.filter(household_head__zone=zone)

    if q:
        households = households.filter(
            Q(household_number__icontains=q)
            | Q(household_head__first_name__icontains=q)
            | Q(household_head__middle_name__icontains=q)
            | Q(household_head__last_name__icontains=q)
            | Q(household_head__zone__icontains=q)
        )

    paginator = Paginator(households, page_size)
    page_obj = paginator.get_page(page)

    results = []
    for household in page_obj.object_list:
        head = household.household_head
        members = [member for member in household.members.all() if member.pk != household.household_head_id]
        results.append(
            {
                "id": household.id,
                "household_number": household.household_number,
                "head_resident_id": head.id if head else None,
                "head_full_name": head.full_name if head else "",
                "zone": head.zone if head and head.zone else "Unassigned",
                "member_count": len(members),
                "house_ownership": household.house_ownership,
                "total_monthly_income": str(household.total_monthly_income)
                if household.total_monthly_income is not None
                else None,
            }
        )

    return JsonResponse(
        {
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": results,
        }
    )
