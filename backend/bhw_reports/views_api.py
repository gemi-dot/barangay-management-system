from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET
from accounts.roles import user_has_office_role

from .models import FourPsBeneficiaryReport, HealthReport, PregnancyReport, SeniorCitizenReport


def _staff_guard(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if not user_has_office_role(user):
        return JsonResponse({"detail": "Staff access is required."}, status=403)
    return None


def _paginate(queryset, page_raw, page_size_raw):
    try:
        page = max(1, int(page_raw or "1"))
    except ValueError:
        page = 1

    try:
        page_size = int(page_size_raw or "20")
    except ValueError:
        page_size = 20

    page_size = min(max(page_size, 1), 100)

    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)
    return paginator, page_obj, page


@require_GET
@login_required
def bhw_reports_summary_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    today = timezone.localdate()
    week_out = today + timedelta(days=7)

    pregnancy_ongoing = PregnancyReport.objects.filter(pregnancy_outcome="ongoing", is_active=True)
    due_soon = pregnancy_ongoing.filter(expected_due_date__gte=today, expected_due_date__lte=week_out).count()

    thirty_days_ago = today - timedelta(days=30)

    return JsonResponse(
        {
            "senior_citizens_total": SeniorCitizenReport.objects.filter(is_active=True).count(),
            "fourps_total": FourPsBeneficiaryReport.objects.filter(is_active=True).count(),
            "pregnancy_ongoing_total": pregnancy_ongoing.count(),
            "pregnancy_due_soon": due_soon,
            "health_reports_last_30_days": HealthReport.objects.filter(report_date__gte=thirty_days_ago).count(),
            "health_reports_total": HealthReport.objects.count(),
        }
    )


@require_GET
@login_required
def bhw_senior_citizens_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    q = request.GET.get("q", "").strip()
    queryset = SeniorCitizenReport.objects.select_related("resident").filter(is_active=True).order_by(
        "resident__last_name", "resident__first_name"
    )
    if q:
        queryset = queryset.filter(
            Q(resident__first_name__icontains=q)
            | Q(resident__middle_name__icontains=q)
            | Q(resident__last_name__icontains=q)
            | Q(resident__zone__icontains=q)
            | Q(caregiver_name__icontains=q)
        )

    paginator, page_obj, page = _paginate(queryset, request.GET.get("page"), request.GET.get("page_size"))

    return JsonResponse(
        {
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
def bhw_fourps_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    q = request.GET.get("q", "").strip()
    queryset = FourPsBeneficiaryReport.objects.select_related("beneficiary").filter(is_active=True).order_by(
        "beneficiary__last_name", "beneficiary__first_name"
    )
    if q:
        queryset = queryset.filter(
            Q(beneficiary__first_name__icontains=q)
            | Q(beneficiary__middle_name__icontains=q)
            | Q(beneficiary__last_name__icontains=q)
            | Q(household_id__icontains=q)
            | Q(beneficiary__zone__icontains=q)
        )

    paginator, page_obj, page = _paginate(queryset, request.GET.get("page"), request.GET.get("page_size"))

    return JsonResponse(
        {
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
                    "monthly_grant_amount": str(row.monthly_grant_amount),
                    "set_of_year": row.set_of_year,
                }
                for row in page_obj.object_list
            ],
        }
    )


@require_GET
@login_required
def bhw_pregnancy_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    outcome = request.GET.get("outcome", "ongoing").strip()
    q = request.GET.get("q", "").strip()

    queryset = PregnancyReport.objects.select_related("pregnant_woman").order_by("-created_at")
    if outcome:
        queryset = queryset.filter(pregnancy_outcome=outcome)
    if q:
        queryset = queryset.filter(
            Q(pregnant_woman__first_name__icontains=q)
            | Q(pregnant_woman__middle_name__icontains=q)
            | Q(pregnant_woman__last_name__icontains=q)
            | Q(pregnant_woman__zone__icontains=q)
        )

    paginator, page_obj, page = _paginate(queryset, request.GET.get("page"), request.GET.get("page_size"))

    return JsonResponse(
        {
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
                    "pregnancy_outcome": row.pregnancy_outcome,
                    "prenatal_visits": row.number_of_prenatal_visits,
                }
                for row in page_obj.object_list
            ],
        }
    )


@require_GET
@login_required
def bhw_health_api(request):
    denied = _staff_guard(request)
    if denied:
        return denied

    q = request.GET.get("q", "").strip()
    report_type = request.GET.get("report_type", "").strip()

    queryset = HealthReport.objects.select_related("resident").order_by("-report_date", "-id")
    if report_type:
        queryset = queryset.filter(report_type=report_type)
    if q:
        queryset = queryset.filter(
            Q(resident__first_name__icontains=q)
            | Q(resident__middle_name__icontains=q)
            | Q(resident__last_name__icontains=q)
            | Q(resident__zone__icontains=q)
            | Q(diagnosis__icontains=q)
            | Q(healthcare_provider__icontains=q)
        )

    paginator, page_obj, page = _paginate(queryset, request.GET.get("page"), request.GET.get("page_size"))

    report_type_counts = list(
        HealthReport.objects.values("report_type").annotate(total=Count("id")).order_by("report_type")
    )

    return JsonResponse(
        {
            "count": paginator.count,
            "next": page + 1 if page_obj.has_next() else None,
            "previous": page - 1 if page_obj.has_previous() else None,
            "report_type_counts": report_type_counts,
            "results": [
                {
                    "id": row.id,
                    "resident_id": row.resident_id,
                    "full_name": row.resident.full_name,
                    "zone": row.resident.zone,
                    "report_type": row.report_type,
                    "report_date": row.report_date.isoformat(),
                    "healthcare_provider": row.healthcare_provider,
                }
                for row in page_obj.object_list
            ],
        }
    )
