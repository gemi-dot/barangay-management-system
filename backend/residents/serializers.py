from rest_framework import serializers
from django.db.models import Q

from .models import DocumentRequest, HouseholdMembership, Resident, ResidentQrIdentity
from .document_services import available_document_transitions, document_print_path
from .resident_profile_services import profile_alerts, profile_permissions, profile_summary


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """Allows response field projection via a `fields` kwarg."""

    def __init__(self, *args, **kwargs):
        requested_fields = kwargs.pop('fields', None)
        super().__init__(*args, **kwargs)

        if requested_fields is None:
            return

        allowed = set(requested_fields)
        existing = set(self.fields)
        for field_name in existing - allowed:
            self.fields.pop(field_name)


class ResidentListSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = Resident
        fields = (
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'zone',
            'gender',
            'precinct_number',
            'is_active',
            'residency_status',
            'is_senior_citizen',
            'is_4ps_beneficiary',
        )


class ResidentDetailSerializer(DynamicFieldsModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()

    class Meta:
        model = Resident
        fields = (
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'full_name',
            'age',
            'date_of_birth',
            'place_of_birth',
            'gender',
            'civil_status',
            'citizenship',
            'contact_number',
            'email',
            'house_number',
            'street',
            'zone',
            'barangay',
            'city_municipality',
            'province',
            'zip_code',
            'precinct_number',
            'voters_id',
            'employment_status',
            'occupation',
            'monthly_income',
            'educational_attainment',
            'philhealth_number',
            'sss_gsis_number',
            'tin_number',
            'blood_type',
            'allergies',
            'medical_conditions',
            'is_active',
            'residency_status',
            'is_pwd',
            'pwd_type',
            'is_senior_citizen',
            'is_solo_parent',
            'is_indigenous',
            'is_4ps_beneficiary',
            'date_registered',
            'created_at',
            'updated_at',
            'qr_code',
        )


class ResidentDetailEndpointSerializer(serializers.Serializer):
    """Structured detail payload for profile/detail screens."""

    def to_representation(self, instance):
        detail = ResidentDetailSerializer(instance, context=self.context).data
        memberships = getattr(instance, 'profile_household_memberships', None)
        if memberships is None:
            memberships = list(instance.household_memberships.select_related('household__household_head'))
        active_membership = next(
            (item for item in memberships if item.status == HouseholdMembership.Status.ACTIVE), None
        )
        household_payload = None
        if active_membership:
            household = active_membership.household
            household_members = getattr(household, 'profile_active_memberships', None)
            if household_members is None:
                household_members = household.memberships.filter(
                    status=HouseholdMembership.Status.ACTIVE
                ).select_related('resident')
            household_payload = {
                'id': household.id,
                'household_number': household.household_number,
                'head_resident_id': household.household_head_id,
                'head_full_name': household.household_head.full_name,
                'complete_address': household.complete_address,
                'purok': household.purok,
                'status': household.status,
                'relationship_to_head': active_membership.relationship_to_head,
                'members': [
                    {
                        'resident_id': membership.resident_id,
                        'full_name': membership.resident.full_name,
                        'relationship_to_head': membership.relationship_to_head,
                        'resident_status': 'active' if membership.resident.is_active else 'inactive',
                    }
                    for membership in household_members
                ],
            }

        document_filter = Q(resident=instance) | Q(resident__isnull=True, full_name__iexact=instance.full_name)
        if instance.portal_user_id:
            document_filter |= Q(submitted_by_id=instance.portal_user_id)
        documents = DocumentRequest.objects.filter(document_filter).distinct().order_by('-created_at')[:50]
        service_logs = instance.service_logs.select_related('logged_by').order_by('-created_at')[:50]

        return {
            'identity': {
                'id': detail['id'],
                'full_name': detail['full_name'],
                'first_name': detail['first_name'],
                'middle_name': detail['middle_name'],
                'last_name': detail['last_name'],
                'suffix': detail['suffix'],
                'age': detail['age'],
                'gender': detail['gender'],
                'date_of_birth': detail['date_of_birth'],
                'place_of_birth': detail['place_of_birth'],
                'civil_status': detail['civil_status'],
                'citizenship': detail['citizenship'],
            },
            'contact': {
                'contact_number': detail['contact_number'],
                'email': detail['email'],
            },
            'address': {
                'house_number': detail['house_number'],
                'street': detail['street'],
                'zone': detail['zone'],
                'barangay': detail['barangay'],
                'city_municipality': detail['city_municipality'],
                'province': detail['province'],
                'zip_code': detail['zip_code'],
            },
            'voter': {
                'precinct_number': detail['precinct_number'],
                'voters_id': detail['voters_id'],
            },
            'socioeconomic': {
                'employment_status': detail['employment_status'],
                'occupation': detail['occupation'],
                'educational_attainment': detail['educational_attainment'],
                'monthly_income': detail['monthly_income'],
                'is_4ps_beneficiary': detail['is_4ps_beneficiary'],
            },
            'identification': {
                'philhealth_number': detail['philhealth_number'],
                'sss_gsis_number': detail['sss_gsis_number'],
                'tin_number': detail['tin_number'],
            },
            'health': {
                'blood_type': detail['blood_type'],
                'allergies': detail['allergies'],
                'medical_conditions': detail['medical_conditions'],
                'is_pwd': detail['is_pwd'],
                'pwd_type': detail['pwd_type'],
                'is_senior_citizen': detail['is_senior_citizen'],
                'is_solo_parent': detail['is_solo_parent'],
                'is_indigenous': detail['is_indigenous'],
            },
            'household': household_payload,
            'household_history': [
                {
                    'household_id': membership.household_id,
                    'household_number': membership.household.household_number,
                    'relationship_to_head': membership.relationship_to_head,
                    'status': membership.status,
                    'joined_date': membership.joined_date.isoformat(),
                    'left_date': membership.left_date.isoformat() if membership.left_date else None,
                }
                for membership in memberships
            ],
            'family': {
                'father_name': instance.father_name,
                'mother_name': instance.mother_name,
                'spouse_name': instance.spouse_name,
                'emergency_contact_name': instance.emergency_contact_name,
                'emergency_contact_number': instance.emergency_contact_number,
                'emergency_contact_relationship': instance.emergency_contact_relationship,
            },
            'documents': [
                {
                    'id': document.id,
                    'tracking_number': document.tracking_number,
                    'document_type': document.document_type,
                    'document_type_display': document.get_document_type_display(),
                    'purpose': document.purpose,
                    'status': document.status,
                    'status_display': document.get_status_display(),
                    'created_at': document.created_at.isoformat(),
                    'updated_at': document.updated_at.isoformat(),
                    'request_source': document.request_source,
                    'request_source_display': document.get_request_source_display(),
                    'processed_by': document.processed_by.get_full_name() if document.processed_by else '',
                    'approved_at': document.approved_at.isoformat() if document.approved_at else None,
                    'released_at': document.released_at.isoformat() if document.released_at else None,
                    'document_number': document.tracking_number,
                    'remarks': document.remarks,
                    'available_transitions': available_document_transitions(document),
                    'print_url': document_print_path(document),
                }
                for document in documents
            ],
            'history': [
                {
                    'id': log.id,
                    'action': log.action,
                    'action_display': log.get_action_display(),
                    'notes': log.notes,
                    'created_at': log.created_at.isoformat(),
                    'logged_by': log.logged_by.username if log.logged_by else '',
                }
                for log in service_logs
            ],
            'qr_profile': {
                'code': instance.qr_code,
                'image_url': instance.qr_image.url if instance.qr_image else None,
                'identity': self._qr_identity(instance),
                'history': self._qr_history(instance),
            },
            'summary': profile_summary(instance, active_membership),
            'alerts': profile_alerts(instance, active_membership),
            'permissions': profile_permissions(self.context['request'].user),
            'system': {
                'is_active': detail['is_active'],
                'residency_status': detail['residency_status'],
                'date_registered': detail['date_registered'],
                'created_at': detail['created_at'],
                'updated_at': detail['updated_at'],
                'qr_code': detail['qr_code'],
            },
        }

    @staticmethod
    def _qr_identity(instance):
        identity = next(
            (item for item in instance.qr_identities.all() if item.status == ResidentQrIdentity.Status.ACTIVE),
            None,
        )
        if not identity:
            return None
        return {
            'identifier': identity.identifier,
            'status': identity.status,
            'issued_at': identity.issued_at.isoformat(),
            'issued_by': identity.issued_by.get_full_name() or identity.issued_by.username if identity.issued_by else '',
        }

    @staticmethod
    def _qr_history(instance):
        return [
            {
                'id': event.id,
                'event_type': event.event_type,
                'event_display': event.get_event_type_display(),
                'result': event.result,
                'remarks': event.remarks,
                'performed_by': event.performed_by.get_full_name() or event.performed_by.username if event.performed_by else '',
                'created_at': event.created_at.isoformat(),
            }
            for event in list(instance.qr_audit_events.all())[:100]
        ]


class ResidentSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = Resident
        fields = "__all__"
