from datetime import datetime, time, timedelta

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from bhw_reports.models import (
    FourPsBeneficiaryReport,
    PregnancyReport,
    SariSariStoreReport,
    SeniorCitizenReport,
)
from residents.models import Resident, ResidentServiceLog


def _staff_guard(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if not user.is_staff:
        return JsonResponse({"detail": "Staff access is required."}, status=403)
    return None


def _page_params(request):
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
    return page, page_size


@require_GET
@login_required
def reports_today_visitors_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    today = timezone.localdate()
    day_start = timezone.make_aware(datetime.combine(today, time.min))
    next_day_start = day_start + timedelta(days=1)

    logs = (
        ResidentServiceLog.objects.filter(
            action=ResidentServiceLog.ACTION_VISITED_TODAY,
            created_at__gte=day_start,
            created_at__lt=next_day_start,
        )
        .select_related("resident", "logged_by")
        .order_by("-created_at", "-id")
    )

    distinct = []
    seen = set()
    for log in logs:
        if log.resident_id in seen:
            continue
        seen.add(log.resident_id)
        distinct.append(log)

    return JsonResponse(
        {
            "report_date": today.isoformat(),
            "visitors_today_count": len(distinct),
            "results": [
                {
                    "resident_id": log.resident_id,
                    "full_name": log.resident.full_name,
                    "zone": log.resident.zone,
                    "precinct_number": log.resident.precinct_number,
                    "logged_at": timezone.localtime(log.created_at).isoformat(),
                    "logged_by": log.logged_by.username if log.logged_by else "",
                }
                for log in distinct
            ],
        }
    )


@require_GET
@login_required
def reports_senior_citizens_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    page, page_size = _page_params(request)
    q = request.GET.get("q", "").strip()
    zone = request.GET.get("zone", "").strip()

    seniors = Resident.objects.filter(is_senior_citizen=True, is_active=True)
    senior_reports = SeniorCitizenReport.objects.filter(is_active=True).select_related("resident")

    if zone:
        seniors = seniors.filter(zone=zone)
        senior_reports = senior_reports.filter(resident__zone=zone)

    if q:
        senior_reports = senior_reports.filter(
            Q(resident__first_name__icontains=q)
            | Q(resident__middle_name__icontains=q)
            | Q(resident__last_name__icontains=q)
            | Q(caregiver_name__icontains=q)
            | Q(resident__zone__icontains=q)
        )

    senior_reports = senior_reports.order_by("resident__last_name", "resident__first_name")
    paginator = Paginator(senior_reports, page_size)
    page_obj = paginator.get_page(page)

    zones = list(
        Resident.objects.filter(is_active=True).values_list("zone", flat=True).distinct().order_by("zone")
    )

    total_seniors = seniors.count()
    seniors_with_reports = senior_reports.count()

    return JsonResponse(
        {
            "total_seniors": total_seniors,
            "seniors_with_reports": seniors_with_reports,
            "seniors_needing_assessment": max(0, total_seniors - seniors_with_reports),
            "zones": zones,
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": [
                {
                    "id": row.id,
                    "resident_id": row.resident_id,
                    "full_name": row.resident.full_name,
                    "zone": row.resident.zone,
                    "mobility_status": row.mobility_status,
                    "pension_source": row.pension_source,
                    "caregiver_name": row.caregiver_name,
                }
                for row in page_obj.object_list
            ],
        }
    )


@require_GET
@login_required
def reports_businesses_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    page, page_size = _page_params(request)
    q = request.GET.get("q", "").strip()

    businesses = SariSariStoreReport.objects.filter(is_active=True).select_related("owner")

    if q:
        businesses = businesses.filter(
            Q(business_name__icontains=q)
            | Q(owner__first_name__icontains=q)
            | Q(owner__middle_name__icontains=q)
            | Q(owner__last_name__icontains=q)
            | Q(owner__zone__icontains=q)
        )

    businesses = businesses.order_by("business_name")
    paginator = Paginator(businesses, page_size)
    page_obj = paginator.get_page(page)

    return JsonResponse(
        {
            "total_businesses": businesses.count(),
            "sari_sari_count": businesses.filter(business_type="sari_sari").count(),
            "carenderia_count": businesses.filter(business_type="carenderia").count(),
            "both_count": businesses.filter(business_type="both").count(),
            "sanitation_compliant": businesses.filter(has_proper_sanitation=True).count(),
            "fire_safety_compliant": businesses.filter(has_fire_safety_measures=True).count(),
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": [
                {
                    "id": row.id,
                    "business_name": row.business_name,
                    "business_type": row.business_type,
                    "owner_name": row.owner.full_name,
                    "zone": row.owner.zone,
                    "has_proper_sanitation": row.has_proper_sanitation,
                    "has_fire_safety_measures": row.has_fire_safety_measures,
                }
                for row in page_obj.object_list
            ],
        }
    )


@require_GET
@login_required
def reports_fourps_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    page, page_size = _page_params(request)
    q = request.GET.get("q", "").strip()

    beneficiaries = FourPsBeneficiaryReport.objects.filter(is_active=True).select_related("beneficiary")
    if q:
        beneficiaries = beneficiaries.filter(
            Q(beneficiary__first_name__icontains=q)
            | Q(beneficiary__middle_name__icontains=q)
            | Q(beneficiary__last_name__icontains=q)
            | Q(household_id__icontains=q)
            | Q(beneficiary__zone__icontains=q)
        )

    beneficiaries = beneficiaries.order_by("beneficiary__last_name", "beneficiary__first_name")
    paginator = Paginator(beneficiaries, page_size)
    page_obj = paginator.get_page(page)

    return JsonResponse(
        {
            "total_beneficiaries": beneficiaries.count(),
            "education_compliant": beneficiaries.filter(education_compliance=True).count(),
            "health_compliant": beneficiaries.filter(health_compliance=True).count(),
            "fds_compliant": beneficiaries.filter(family_development_sessions=True).count(),
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": [
                {
                    "id": row.id,
                    "beneficiary_id": row.beneficiary_id,
                    "full_name": row.beneficiary.full_name,
                    "zone": row.beneficiary.zone,
                    "household_id": row.household_id,
                    "education_compliance": row.education_compliance,
                    "health_compliance": row.health_compliance,
                    "family_development_sessions": row.family_development_sessions,
                    "monthly_grant_amount": str(row.monthly_grant_amount),
                }
                for row in page_obj.object_list
            ],
        }
    )


@require_GET
@login_required
def reports_pregnancy_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    page, page_size = _page_params(request)
    q = request.GET.get("q", "").strip()

    pregnancies = PregnancyReport.objects.filter(pregnancy_outcome="ongoing", is_active=True).select_related(
        "pregnant_woman"
    )

    if q:
        pregnancies = pregnancies.filter(
            Q(pregnant_woman__first_name__icontains=q)
            | Q(pregnant_woman__middle_name__icontains=q)
            | Q(pregnant_woman__last_name__icontains=q)
            | Q(pregnant_woman__zone__icontains=q)
        )

    pregnancies = pregnancies.order_by("expected_due_date")

    today = timezone.localdate()
    next_month = today + timedelta(days=30)

    first_trimester = pregnancies.filter(age_of_gestation_weeks__lte=12).count()
    second_trimester = pregnancies.filter(age_of_gestation_weeks__gte=13, age_of_gestation_weeks__lte=28).count()
    third_trimester = pregnancies.filter(age_of_gestation_weeks__gte=29).count()

    paginator = Paginator(pregnancies, page_size)
    page_obj = paginator.get_page(page)

    return JsonResponse(
        {
            "total_pregnancies": pregnancies.count(),
            "high_risk_pregnancies": pregnancies.filter(high_risk_pregnancy=True).count(),
            "first_trimester_count": first_trimester,
            "second_trimester_count": second_trimester,
            "third_trimester_count": third_trimester,
            "upcoming_deliveries_count": pregnancies.filter(expected_due_date__lte=next_month).count(),
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "results": [
                {
                    "id": row.id,
                    "resident_id": row.pregnant_woman_id,
                    "full_name": row.pregnant_woman.full_name,
                    "zone": row.pregnant_woman.zone,
                    "expected_due_date": row.expected_due_date.isoformat(),
                    "age_of_gestation_weeks": row.age_of_gestation_weeks,
                    "high_risk_pregnancy": row.high_risk_pregnancy,
                    "due_soon": row.expected_due_date <= next_month,
                    "number_of_prenatal_visits": row.number_of_prenatal_visits,
                }
                for row in page_obj.object_list
            ],
        }
    )
