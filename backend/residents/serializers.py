from rest_framework import serializers

from .models import Resident


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
            'educational_attainment',
            'blood_type',
            'allergies',
            'medical_conditions',
            'is_active',
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
                'is_4ps_beneficiary': detail['is_4ps_beneficiary'],
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
            'system': {
                'is_active': detail['is_active'],
                'date_registered': detail['date_registered'],
                'created_at': detail['created_at'],
                'updated_at': detail['updated_at'],
                'qr_code': detail['qr_code'],
            },
        }


class ResidentSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = Resident
        fields = "__all__"
