from datetime import datetime, time, timedelta

from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, pagination, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from bhw_reports.models import (
    FourPsBeneficiaryReport,
    HealthReport,
    PregnancyReport,
    SariSariStoreReport,
)

from .models import DocumentRequest, Household, Resident, ResidentServiceLog
from .serializers import (
    ResidentDetailEndpointSerializer,
    ResidentDetailSerializer,
    ResidentListSerializer,
    ResidentSerializer,
)


class ResidentPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer
    pagination_class = ResidentPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = [
        'zone',
        'gender',
        'is_active',
        'is_senior_citizen',
        'is_4ps_beneficiary',
        'precinct_number',
    ]
    search_fields = [
        'first_name',
        'middle_name',
        'last_name',
        'barangay',
        'city_municipality',
        'precinct_number',
    ]
    ordering_fields = [
        'last_name',
        'first_name',
        'created_at',
        'updated_at',
    ]
    ordering = ['last_name', 'first_name']

    def get_queryset(self):
        queryset = Resident.objects.all()
        if self.action != 'list':
            return queryset

        list_fields = [
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'zone',
            'gender',
            'precinct_number',
            'is_active',
            'is_senior_citizen',
            'is_4ps_beneficiary',
        ]
        return queryset.only(*list_fields)

    def get_serializer_class(self):
        if self.action == 'list':
            return ResidentListSerializer
        if self.action == 'retrieve':
            return ResidentDetailSerializer
        return ResidentSerializer

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', self.get_serializer_context())

        if self.action == 'list':
            fields_param = self.request.query_params.get('fields', '')
            if fields_param:
                requested_fields = [
                    field.strip() for field in fields_param.split(',') if field.strip()
                ]
                allowed_fields = set(serializer_class.Meta.fields)
                selected_fields = [
                    field for field in requested_fields if field in allowed_fields
                ]
                if selected_fields:
                    kwargs['fields'] = selected_fields

        return serializer_class(*args, **kwargs)

    @action(detail=True, methods=['get'], url_path='detail')
    def detail_view(self, request, pk=None):
        resident = self.get_object()
        serializer = ResidentDetailEndpointSerializer(
            resident,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)


class DashboardSummaryAPIView(APIView):
    """Single payload for dashboard cards and chart widgets."""

    def get(self, request):
        today = timezone.localdate()
        day_start = timezone.make_aware(datetime.combine(today, time.min))
        next_day_start = day_start + timedelta(days=1)

        active_residents = Resident.objects.filter(is_active=True)

        total_residents = active_residents.count()
        total_households = Household.objects.count()
        male_residents = active_residents.filter(gender='M').count()
        female_residents = active_residents.filter(gender='F').count()

        children = active_residents.filter(
            date_of_birth__gt=today - timedelta(days=18 * 365)
        ).count()
        adults = active_residents.filter(
            date_of_birth__lte=today - timedelta(days=18 * 365),
            date_of_birth__gt=today - timedelta(days=60 * 365),
        ).count()
        seniors = active_residents.filter(
            date_of_birth__lte=today - timedelta(days=60 * 365)
        ).count()

        pwd_count = active_residents.filter(is_pwd=True).count()
        senior_citizens = active_residents.filter(is_senior_citizen=True).count()
        fourps_beneficiaries = active_residents.filter(is_4ps_beneficiary=True).count()

        active_businesses = SariSariStoreReport.objects.filter(is_active=True).count()
        active_pregnancies = PregnancyReport.objects.filter(
            pregnancy_outcome='ongoing',
            is_active=True,
        ).count()
        active_fourps_reports = FourPsBeneficiaryReport.objects.filter(is_active=True).count()
        recent_health_reports = HealthReport.objects.filter(
            report_date__gte=today - timedelta(days=7)
        ).count()

        zone_distribution = list(
            active_residents.values('zone')
            .annotate(count=Count('id'))
            .order_by('zone')
        )
        for row in zone_distribution:
            row['percentage'] = round((row['count'] * 100 / total_residents), 1) if total_residents else 0

        ready_today_count = DocumentRequest.objects.filter(
            status='ready_for_pickup',
            updated_at__date=today,
        ).count()
        currently_ready_count = DocumentRequest.objects.filter(status='ready_for_pickup').count()
        pending_document_requests = DocumentRequest.objects.filter(
            status__in=['pending', 'processing']
        ).count()

        visitors_today_count = ResidentServiceLog.objects.filter(
            action=ResidentServiceLog.ACTION_VISITED_TODAY,
            created_at__gte=day_start,
            created_at__lt=next_day_start,
        ).values('resident_id').distinct().count()

        payload = {
            'generated_at': timezone.now().isoformat(),
            'cards': {
                'total_residents': total_residents,
                'total_households': total_households,
                'senior_citizens': senior_citizens,
                'fourps_beneficiaries': fourps_beneficiaries,
                'pwd_count': pwd_count,
                'active_businesses': active_businesses,
                'active_pregnancies': active_pregnancies,
                'active_fourps_reports': active_fourps_reports,
                'recent_health_reports': recent_health_reports,
                'ready_today_count': ready_today_count,
                'currently_ready_count': currently_ready_count,
                'visitors_today_count': visitors_today_count,
                'pending_document_requests': pending_document_requests,
            },
            'charts': {
                'gender_distribution': {
                    'male': male_residents,
                    'female': female_residents,
                },
                'age_distribution': {
                    'children': children,
                    'adults': adults,
                    'seniors': seniors,
                },
                'zone_distribution': zone_distribution,
            },
        }
        return Response(payload)
