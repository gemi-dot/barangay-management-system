from datetime import datetime, time, timedelta
from datetime import date

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Prefetch
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, pagination, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.capabilities import (
    DIGITAL_ID_ISSUE,
    DIGITAL_ID_REISSUE,
    DIGITAL_ID_REVOKE,
    DIGITAL_ID_VERIFY,
    DOCUMENT_APPROVE,
    DOCUMENT_CREATE,
    DOCUMENT_PROCESS,
    DOCUMENT_RELEASE,
    DOCUMENT_VIEW,
    FAMILY_MANAGE,
    FAMILY_VIEW,
    RESIDENT_CREATE,
    RESIDENT_DELETE,
    RESIDENT_EDIT,
    RESIDENT_LIFECYCLE_ARCHIVE,
    RESIDENT_LIFECYCLE_DECEASED,
    RESIDENT_LIFECYCLE_TRANSFER,
    RESIDENT_RESTORE,
    RESIDENT_VIEW_BASIC,
    RESIDENT_VIEW_SENSITIVE,
)
from accounts.permissions import CapabilityPermission
from accounts.roles import user_has_office_role

from bhw_reports.models import (
    FourPsBeneficiaryReport,
    HealthReport,
    PregnancyReport,
    SariSariStoreReport,
)

from .family_services import (
    create_reciprocal_relationship,
    deactivate_reciprocal_relationship,
    family_tree_for,
)
from .models import DocumentRequest, FamilyRelationship, Household, HouseholdMembership, Resident, ResidentQrAuditEvent, ResidentQrIdentity, ResidentServiceLog
from .document_services import (
    available_document_transitions, create_resident_document_request, document_print_path,
    resident_document_warnings, transition_document_request,
)
from .qr_services import issue_qr_identity, reissue_qr_identity, revoke_qr_identity, verification_result
from .models import BarangayOfficeProfile
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
    permission_classes = [CapabilityPermission]
    capability_by_action = {
        'list': RESIDENT_VIEW_BASIC,
        'retrieve': RESIDENT_VIEW_SENSITIVE,
        'detail_view': RESIDENT_VIEW_SENSITIVE,
        'quick_view': RESIDENT_VIEW_SENSITIVE,
        'create': RESIDENT_CREATE,
        'update': RESIDENT_EDIT,
        'partial_update': RESIDENT_EDIT,
        'destroy': RESIDENT_DELETE,
        'archive': RESIDENT_LIFECYCLE_ARCHIVE,
        'restore': RESIDENT_RESTORE,
        'transfer': RESIDENT_LIFECYCLE_TRANSFER,
        'mark_deceased': RESIDENT_LIFECYCLE_DECEASED,
        'service_log_action': RESIDENT_EDIT,
        'remove_family_relationship': FAMILY_MANAGE,
        'family_tree': FAMILY_VIEW,
        'quick_document_request': DOCUMENT_CREATE,
        'document_requirements': DOCUMENT_CREATE,
        'issue_qr': DIGITAL_ID_ISSUE,
        'reissue_qr': DIGITAL_ID_REISSUE,
        'revoke_qr': DIGITAL_ID_REVOKE,
    }
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

    def get_required_capability(self, request):
        if self.action == 'family_relationships':
            return FAMILY_MANAGE if request.method == 'POST' else FAMILY_VIEW
        return self.capability_by_action.get(self.action)

    def get_queryset(self):
        queryset = Resident.objects.all()
        if self.action == 'detail_view':
            active_members = HouseholdMembership.objects.filter(
                status=HouseholdMembership.Status.ACTIVE,
            ).select_related('resident')
            memberships = HouseholdMembership.objects.select_related(
                'household__household_head',
            ).prefetch_related(
                Prefetch('household__memberships', queryset=active_members, to_attr='profile_active_memberships')
            ).order_by('-joined_date', '-created_at')
            return queryset.select_related('portal_user').prefetch_related(
                Prefetch('household_memberships', queryset=memberships, to_attr='profile_household_memberships'),
                Prefetch('service_logs', queryset=ResidentServiceLog.objects.select_related('logged_by').order_by('-created_at')),
                Prefetch('qr_identities', queryset=ResidentQrIdentity.objects.select_related('issued_by').order_by('-issued_at')),
                Prefetch('qr_audit_events', queryset=ResidentQrAuditEvent.objects.select_related('performed_by').order_by('-created_at')),
            )
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

    @action(detail=True, methods=['get', 'post'], url_path='family-relationships')
    def family_relationships(self, request, pk=None):
        resident = self.get_object()
        if request.method == 'GET':
            relationships = resident.family_relationships_from.filter(
                status=FamilyRelationship.Status.ACTIVE
            ).select_related('to_resident', 'created_by')
            return Response(
                {
                    'results': [
                        {
                            'id': relationship.id,
                            'pair_id': str(relationship.pair_id),
                            'relationship_type': relationship.relationship_type,
                            'relationship_display': relationship.get_relationship_type_display(),
                            'resident': {
                                'id': relationship.to_resident_id,
                                'full_name': relationship.to_resident.full_name,
                                'gender': relationship.to_resident.gender,
                                'age': relationship.to_resident.age,
                                'is_active': relationship.to_resident.is_active,
                            },
                            'notes': relationship.notes,
                            'created_by': relationship.created_by.username if relationship.created_by else '',
                            'created_at': relationship.created_at.isoformat(),
                        }
                        for relationship in relationships
                    ]
                }
            )

        to_resident = Resident.objects.filter(pk=request.data.get('to_resident_id')).first()
        if not to_resident:
            return Response({'to_resident_id': 'Select a valid resident.'}, status=400)
        relationship_type = (request.data.get('relationship_type') or '').strip()
        notes = (request.data.get('notes') or '').strip()
        try:
            relationship = create_reciprocal_relationship(
                from_resident=resident,
                to_resident=to_resident,
                relationship_type=relationship_type,
                notes=notes,
                created_by=request.user,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response(
            {
                'id': relationship.id,
                'pair_id': str(relationship.pair_id),
                'relationship_type': relationship.relationship_type,
                'relationship_display': relationship.get_relationship_type_display(),
                'resident': {
                    'id': relationship.to_resident_id,
                    'full_name': relationship.to_resident.full_name,
                    'gender': relationship.to_resident.gender,
                    'age': relationship.to_resident.age,
                    'is_active': relationship.to_resident.is_active,
                },
                'notes': relationship.notes,
                'created_by': request.user.username,
                'created_at': relationship.created_at.isoformat(),
            },
            status=201,
        )

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'family-relationships/(?P<relationship_id>[^/.]+)',
    )
    def remove_family_relationship(self, request, pk=None, relationship_id=None):
        resident = self.get_object()
        relationship = FamilyRelationship.objects.filter(
            pk=relationship_id,
            from_resident=resident,
            status=FamilyRelationship.Status.ACTIVE,
        ).first()
        if not relationship:
            return Response({'detail': 'Active relationship not found.'}, status=404)
        try:
            deactivate_reciprocal_relationship(relationship=relationship, resident=resident)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response(status=204)

    @action(detail=True, methods=['get'], url_path='family-tree')
    def family_tree(self, request, pk=None):
        return Response(family_tree_for(self.get_object()))

    @action(detail=True, methods=['get'], url_path='quick-view')
    def quick_view(self, request, pk=None):
        resident = self.get_object()
        recent_logs = resident.service_logs.select_related('logged_by')[:8]

        return Response(
            {
                'resident': {
                    'id': resident.id,
                    'full_name': resident.full_name,
                    'age': resident.age,
                    'gender': resident.gender,
                    'contact_number': resident.contact_number,
                    'civil_status': resident.civil_status,
                    'voters_id': resident.voters_id,
                    'precinct_number': resident.precinct_number,
                    'qr_code': resident.qr_code,
                    'complete_address': resident.complete_address,
                    'emergency_contact_name': resident.emergency_contact_name,
                    'emergency_contact_number': resident.emergency_contact_number,
                    'emergency_contact_relationship': resident.emergency_contact_relationship,
                    'is_senior_citizen': resident.is_senior_citizen,
                    'is_4ps_beneficiary': resident.is_4ps_beneficiary,
                    'is_pwd': resident.is_pwd,
                    'is_solo_parent': resident.is_solo_parent,
                    'is_active': resident.is_active,
                },
                'recent_logs': [
                    {
                        'id': log.id,
                        'action': log.action,
                        'action_display': log.get_action_display(),
                        'notes': log.notes,
                        'created_at': log.created_at.isoformat(),
                        'logged_by': log.logged_by.username if log.logged_by else '',
                    }
                    for log in recent_logs
                ],
            }
        )

    @action(detail=True, methods=['post'], url_path='service-log')
    def service_log_action(self, request, pk=None):
        resident = self.get_object()
        action_name = (request.data.get('action') or '').strip()

        if action_name != ResidentServiceLog.ACTION_VISITED_TODAY:
            return Response({'detail': 'Invalid service log action.'}, status=400)

        log = ResidentServiceLog.objects.create(
            resident=resident,
            logged_by=request.user,
            action=ResidentServiceLog.ACTION_VISITED_TODAY,
            notes='Marked visited today from quick view.',
        )

        return Response(
            {
                'detail': f'Visit logged for {resident.full_name}.',
                'log': {
                    'id': log.id,
                    'action': log.action,
                    'action_display': log.get_action_display(),
                    'notes': log.notes,
                    'created_at': log.created_at.isoformat(),
                    'logged_by': log.logged_by.username if log.logged_by else '',
                },
            },
            status=201,
        )

    @action(detail=True, methods=['post'], url_path='quick-document-request')
    def quick_document_request(self, request, pk=None):
        resident = self.get_object()
        requested_type = (request.data.get('document_type') or '').strip()
        try:
            doc = create_resident_document_request(
                resident=resident,
                document_type=requested_type,
                purpose=request.data.get('purpose'),
                remarks=request.data.get('remarks', ''),
                created_by=request.user,
                source=DocumentRequest.RequestSource.PROFILE,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)

        return Response(
            {
                'detail': 'Document request created.',
                'tracking_number': doc.tracking_number,
                'document_type': doc.document_type,
                'document_type_display': doc.get_document_type_display(),
                'status': doc.status,
            },
            status=201,
        )

    @action(detail=True, methods=['get'], url_path='document-requirements')
    def document_requirements(self, request, pk=None):
        resident = self.get_object()
        return Response({
            'resident': {
                'full_name': resident.full_name,
                'address': resident.complete_address,
                'age': resident.age,
                'civil_status': resident.civil_status,
                'is_active': resident.is_active,
            },
            'warnings': resident_document_warnings(resident),
            'document_types': [
                {'value': value, 'label': label} for value, label in DocumentRequest.DOCUMENT_TYPE_CHOICES
            ],
        })

    @action(detail=True, methods=['post'], url_path='qr/issue')
    def issue_qr(self, request, pk=None):
        identity, created = issue_qr_identity(resident=self.get_object(), user=request.user)
        return Response({'identifier': identity.identifier, 'status': identity.status, 'created': created}, status=201 if created else 200)

    @action(detail=True, methods=['post'], url_path='qr/reissue')
    def reissue_qr(self, request, pk=None):
        try:
            identity = reissue_qr_identity(resident=self.get_object(), user=request.user, reason=request.data.get('reason'))
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response({'identifier': identity.identifier, 'status': identity.status}, status=201)

    @action(detail=True, methods=['post'], url_path='qr/revoke')
    def revoke_qr(self, request, pk=None):
        try:
            identity = revoke_qr_identity(resident=self.get_object(), user=request.user, reason=request.data.get('reason'))
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        return Response({'identifier': identity.identifier, 'status': identity.status})

    def _apply_lifecycle(self, *, resident, residency_status, is_active):
        resident.residency_status = residency_status
        resident.is_active = is_active
        resident.save(update_fields=['residency_status', 'is_active', 'updated_at'])
        return Response(ResidentDetailSerializer(resident, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        resident = self.get_object()
        if resident.residency_status == Resident.ResidencyStatus.DECEASED:
            return Response({'detail': 'A deceased resident cannot be archived.'}, status=400)
        return self._apply_lifecycle(
            resident=resident,
            residency_status=Resident.ResidencyStatus.ARCHIVED,
            is_active=False,
        )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        resident = self.get_object()
        if resident.residency_status == Resident.ResidencyStatus.DECEASED:
            return Response({'detail': 'A deceased resident cannot be restored through this action.'}, status=400)
        return self._apply_lifecycle(
            resident=resident,
            residency_status=Resident.ResidencyStatus.ACTIVE,
            is_active=True,
        )

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer(self, request, pk=None):
        resident = self.get_object()
        if resident.residency_status == Resident.ResidencyStatus.DECEASED:
            return Response({'detail': 'A deceased resident cannot be transferred.'}, status=400)
        return self._apply_lifecycle(
            resident=resident,
            residency_status=Resident.ResidencyStatus.TRANSFERRED,
            is_active=False,
        )

    @action(detail=True, methods=['post'], url_path='mark-deceased')
    def mark_deceased(self, request, pk=None):
        return self._apply_lifecycle(
            resident=self.get_object(),
            residency_status=Resident.ResidencyStatus.DECEASED,
            is_active=False,
        )


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


class DocumentRequestPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class StaffOnlyPermission(BasePermission):
    """Restrict endpoint access to authenticated staff users."""

    def has_permission(self, request, view):
        user = request.user
        return user_has_office_role(user)


class DocumentRequestViewSet(viewsets.ViewSet):
    permission_classes = [CapabilityPermission]
    pagination_class = DocumentRequestPagination

    def get_required_capability(self, request):
        if self.action in {'list', 'retrieve'}:
            return DOCUMENT_VIEW
        if self.action == 'update_status':
            return {
                'processing': DOCUMENT_PROCESS,
                'ready_for_pickup': DOCUMENT_APPROVE,
                'released': DOCUMENT_RELEASE,
                # Rejection and cancellation do not have dedicated capabilities.
                # Treat both as queue-processing operations until policy adds one.
                'rejected': DOCUMENT_PROCESS,
                'cancelled': DOCUMENT_PROCESS,
            }.get((request.data.get('status') or '').strip(), DOCUMENT_PROCESS)
        return None

    @staticmethod
    def _serialize_doc(doc):
        return {
            'id': doc.id,
            'tracking_number': doc.tracking_number,
            'full_name': doc.full_name,
            'contact_number': doc.contact_number,
            'email': doc.email,
            'address': doc.address,
            'document_type': doc.document_type,
            'document_type_display': doc.get_document_type_display(),
            'purpose': doc.purpose,
            'preferred_release_date': doc.preferred_release_date.isoformat() if doc.preferred_release_date else None,
            'status': doc.status,
            'status_display': doc.get_status_display(),
            'remarks': doc.remarks,
            'created_at': doc.created_at.isoformat(),
            'updated_at': doc.updated_at.isoformat(),
            'processed_by': doc.processed_by.get_full_name() if doc.processed_by else '',
            'resident_id': doc.resident_id,
            'request_source': doc.request_source,
            'request_source_display': doc.get_request_source_display(),
            'approved_at': doc.approved_at.isoformat() if doc.approved_at else None,
            'released_at': doc.released_at.isoformat() if doc.released_at else None,
            'document_number': doc.tracking_number,
            'available_transitions': available_document_transitions(doc),
            'print_url': document_print_path(doc),
            'status_history': [
                {
                    'from_status': item.from_status,
                    'to_status': item.to_status,
                    'remarks': item.remarks,
                    'changed_by': item.changed_by.get_full_name() or item.changed_by.username if item.changed_by else '',
                    'created_at': item.created_at.isoformat(),
                }
                for item in doc.status_history.all()
            ],
        }

    def get_queryset(self):
        queryset = DocumentRequest.objects.select_related('processed_by', 'resident').prefetch_related('status_history__changed_by').order_by('-created_at')
        status_filter = self.request.query_params.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def list(self, request):
        queryset = self.get_queryset()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serialized = [self._serialize_doc(doc) for doc in page]
        return paginator.get_paginated_response(serialized)

    @action(detail=True, methods=['post'], url_path='status')
    def update_status(self, request, pk=None):
        doc = DocumentRequest.objects.filter(pk=pk).select_related('processed_by').first()
        if doc is None:
            return Response({'detail': 'Document request not found.'}, status=404)

        new_status = (request.data.get('status') or '').strip()
        remarks = (request.data.get('remarks') or '').strip()
        try:
            doc = transition_document_request(
                document=doc, new_status=new_status, changed_by=request.user, remarks=remarks
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        doc = DocumentRequest.objects.select_related('processed_by', 'resident').prefetch_related('status_history__changed_by').get(pk=doc.pk)

        return Response(self._serialize_doc(doc))


class DocumentRequestTrackAPIView(APIView):
    """Public tracking endpoint for resident document requests."""

    permission_classes = [AllowAny]

    def get(self, request):
        tracking_number = (request.query_params.get('tracking_number') or '').strip().upper()
        if not tracking_number:
            return Response({'detail': 'tracking_number is required.'}, status=400)

        doc = DocumentRequest.objects.filter(tracking_number__iexact=tracking_number).first()
        if doc is None:
            return Response({'detail': 'Tracking number not found.'}, status=404)

        return Response(
            {
                'tracking_number': doc.tracking_number,
                'full_name': doc.full_name,
                'document_type': doc.document_type,
                'document_type_display': doc.get_document_type_display(),
                'status': doc.status,
                'status_display': doc.get_status_display(),
                'remarks': doc.remarks,
                'created_at': doc.created_at.isoformat(),
                'updated_at': doc.updated_at.isoformat(),
            }
        )


def _normalize_qr_value(raw_value):
    value = (raw_value or '').strip().upper()
    if '/RESIDENTS/SCAN/' in value:
        value = value.split('/RESIDENTS/SCAN/', 1)[1]
        value = value.split('/', 1)[0]
    if value.startswith('BRGY-RESIDENT:'):
        value = value.split('BRGY-RESIDENT:', 1)[1].strip().upper()
    if value in {'...', '…'}:
        return ''
    return ''.join(char for char in value if char.isalnum())


class QrResolveAPIView(APIView):
    """Resolve a QR input to a resident id and log the scan event."""

    permission_classes = [CapabilityPermission]
    required_capability = DIGITAL_ID_VERIFY

    def post(self, request):
        raw_value = (request.data.get('qr_input') or '').strip()
        code = _normalize_qr_value(raw_value)

        if not code:
            return Response(
                {
                    'status': 'invalid',
                    'raw_value': raw_value,
                    'normalized_code': code,
                    'reason': 'invalid',
                }
            )

        result = verification_result(code, user=request.user, source='staff')
        if result['status'] == 'unknown':
            return Response(
                {
                    'status': 'not_found',
                    'raw_value': raw_value,
                    'normalized_code': code,
                    'reason': 'not_found',
                }
            )

        identity = ResidentQrIdentity.objects.select_related('resident').get(identifier=code)
        resident = identity.resident
        ResidentServiceLog.objects.create(
            resident=resident,
            logged_by=request.user,
            action=ResidentServiceLog.ACTION_SCANNED_QR,
            notes='QR scan resolved to resident quick view.',
        )

        return Response(
            {
                'status': 'ok',
                'raw_value': raw_value,
                'normalized_code': code,
                'resident_id': resident.id,
                'verification_status': result['status'],
            }
        )


class PublicQrVerificationAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, identifier):
        return Response(verification_result(_normalize_qr_value(identifier), source='public'))


class QuickGenderCorrectionAPIView(APIView):
    """Staff tool to fetch/update DOB and gender by zone."""

    permission_classes = [CapabilityPermission]

    def get_required_capability(self, request):
        return RESIDENT_EDIT if request.method == 'POST' else RESIDENT_VIEW_BASIC

    @staticmethod
    def _zone_queryset(zone_filter):
        qs = Resident.objects.filter(is_active=True)
        if zone_filter and zone_filter != 'ALL':
            qs = qs.filter(zone=zone_filter)
        return qs.order_by('last_name', 'first_name', 'middle_name', 'id')

    def get(self, request):
        base_qs = Resident.objects.filter(is_active=True)
        zone_filter = (request.query_params.get('zone') or 'Purok Ipil-ipil').strip()
        residents = self._zone_queryset(zone_filter)
        zone_options = list(base_qs.values_list('zone', flat=True).distinct().order_by('zone'))

        resident_rows = [
            {
                'id': r.id,
                'full_name': r.full_name,
                'date_of_birth': r.date_of_birth.isoformat() if r.date_of_birth else '',
                'gender': r.gender,
            }
            for r in residents
        ]

        return Response(
            {
                'zone_filter': zone_filter,
                'zone_options': zone_options,
                'total_count': len(resident_rows),
                'male_count': sum(1 for row in resident_rows if row['gender'] == 'M'),
                'female_count': sum(1 for row in resident_rows if row['gender'] == 'F'),
                'residents': resident_rows,
            }
        )

    def post(self, request):
        zone_filter = (request.data.get('zone') or 'Purok Ipil-ipil').strip()
        updates = request.data.get('updates') or []

        if not isinstance(updates, list):
            return Response({'detail': 'updates must be a list.'}, status=400)

        resident_map = {
            resident.id: resident
            for resident in self._zone_queryset(zone_filter)
        }

        gender_updates = 0
        birthday_updates = 0
        invalid_birthday_rows = 0

        for row in updates:
            if not isinstance(row, dict):
                continue
            resident_id = row.get('id')
            if not isinstance(resident_id, int) or resident_id not in resident_map:
                continue

            resident = resident_map[resident_id]
            selected_gender = str(row.get('gender', resident.gender)).strip().upper()
            if selected_gender not in {'M', 'F'}:
                selected_gender = resident.gender

            raw_dob = str(row.get('date_of_birth', resident.date_of_birth.isoformat() if resident.date_of_birth else '')).strip()
            parsed_dob = resident.date_of_birth
            if raw_dob:
                try:
                    parsed_dob = date.fromisoformat(raw_dob)
                except ValueError:
                    invalid_birthday_rows += 1

            update_fields = []
            if selected_gender != resident.gender:
                resident.gender = selected_gender
                update_fields.append('gender')
                gender_updates += 1

            if parsed_dob and parsed_dob != resident.date_of_birth:
                resident.date_of_birth = parsed_dob
                update_fields.append('date_of_birth')
                birthday_updates += 1

            if update_fields:
                resident.save(update_fields=update_fields)

        return Response(
            {
                'gender_updates': gender_updates,
                'birthday_updates': birthday_updates,
                'invalid_birthday_rows': invalid_birthday_rows,
            }
        )


class QuickBirthdayCorrectionAPIView(APIView):
    """Staff tool to fetch/update DOB by zone."""

    permission_classes = [CapabilityPermission]

    def get_required_capability(self, request):
        return RESIDENT_EDIT if request.method == 'POST' else RESIDENT_VIEW_BASIC

    @staticmethod
    def _zone_queryset(zone_filter):
        qs = Resident.objects.filter(is_active=True)
        if zone_filter and zone_filter != 'ALL':
            qs = qs.filter(zone=zone_filter)
        return qs.order_by('last_name', 'first_name', 'middle_name', 'id')

    def get(self, request):
        base_qs = Resident.objects.filter(is_active=True)
        zone_filter = (request.query_params.get('zone') or 'Purok Ipil-ipil').strip()
        residents = self._zone_queryset(zone_filter)
        zone_options = list(base_qs.values_list('zone', flat=True).distinct().order_by('zone'))

        resident_rows = [
            {
                'id': r.id,
                'full_name': r.full_name,
                'date_of_birth': r.date_of_birth.isoformat() if r.date_of_birth else '',
            }
            for r in residents
        ]

        return Response(
            {
                'zone_filter': zone_filter,
                'zone_options': zone_options,
                'total_count': len(resident_rows),
                'default_dob_count': sum(1 for row in resident_rows if row['date_of_birth'] == '1900-01-01'),
                'residents': resident_rows,
            }
        )

    def post(self, request):
        zone_filter = (request.data.get('zone') or 'Purok Ipil-ipil').strip()
        updates = request.data.get('updates') or []

        if not isinstance(updates, list):
            return Response({'detail': 'updates must be a list.'}, status=400)

        resident_map = {
            resident.id: resident
            for resident in self._zone_queryset(zone_filter)
        }

        birthday_updates = 0
        invalid_birthday_rows = 0

        for row in updates:
            if not isinstance(row, dict):
                continue
            resident_id = row.get('id')
            if not isinstance(resident_id, int) or resident_id not in resident_map:
                continue

            resident = resident_map[resident_id]
            raw_dob = str(row.get('date_of_birth', resident.date_of_birth.isoformat() if resident.date_of_birth else '')).strip()
            if not raw_dob:
                continue

            try:
                parsed_dob = date.fromisoformat(raw_dob)
            except ValueError:
                invalid_birthday_rows += 1
                continue

            if parsed_dob != resident.date_of_birth:
                resident.date_of_birth = parsed_dob
                resident.save(update_fields=['date_of_birth'])
                birthday_updates += 1

        return Response(
            {
                'birthday_updates': birthday_updates,
                'invalid_birthday_rows': invalid_birthday_rows,
            }
        )


class OfficeProfileAPIView(APIView):
    """Read and update the barangay office profile used by certificates and branding."""

    permission_classes = [StaffOnlyPermission]

    @staticmethod
    def _serialize(profile):
        return {
            'office_name': profile.office_name,
            'barangay': profile.barangay,
            'city_municipality': profile.city_municipality,
            'province': profile.province,
            'captain_name': profile.captain_name,
            'default_or_number': profile.default_or_number,
            'default_control_number': profile.default_control_number,
            'updated_at': profile.updated_at.isoformat(),
        }

    def get(self, request):
        profile = BarangayOfficeProfile.get_solo()
        return Response(self._serialize(profile))

    def patch(self, request):
        profile = BarangayOfficeProfile.get_solo()

        for field in [
            'office_name',
            'barangay',
            'city_municipality',
            'province',
            'captain_name',
            'default_or_number',
            'default_control_number',
        ]:
            if field in request.data:
                value = request.data.get(field)
                setattr(profile, field, '' if value is None else str(value).strip())

        profile.save()
        return Response(self._serialize(profile))
