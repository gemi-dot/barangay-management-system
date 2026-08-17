from datetime import date

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .household_services import create_household
from .models import Household, HouseholdMembership, Resident


def household_statistics(household):
    memberships = household.memberships.filter(status=HouseholdMembership.Status.ACTIVE).select_related('resident')
    residents = [membership.resident for membership in memberships]
    today = date.today()

    def age(resident):
        born = resident.date_of_birth
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

    active_residents = [resident for resident in residents if resident.is_active]
    return {
        'total_members': len(residents),
        'active_members': len(active_residents),
        'inactive_members': len(residents) - len(active_residents),
        'children_count': sum(age(resident) < 18 for resident in active_residents),
        'adult_count': sum(age(resident) >= 18 for resident in active_residents),
        'senior_citizen_count': sum(age(resident) >= 60 for resident in active_residents),
        'male_count': sum(resident.gender == 'M' for resident in active_residents),
        'female_count': sum(resident.gender == 'F' for resident in active_residents),
        'voter_count': sum(bool(resident.voters_id.strip()) for resident in active_residents),
        'pwd_count': sum(resident.is_pwd for resident in active_residents),
        'four_ps_beneficiary_count': sum(resident.is_4ps_beneficiary for resident in active_residents),
    }


class HouseholdMemberSerializer(serializers.ModelSerializer):
    resident_id = serializers.IntegerField(source='resident.id', read_only=True)
    resident_code = serializers.CharField(source='resident.qr_code', read_only=True)
    full_name = serializers.CharField(source='resident.full_name', read_only=True)
    photo_url = serializers.SerializerMethodField()
    sex = serializers.CharField(source='resident.gender', read_only=True)
    birth_date = serializers.DateField(source='resident.date_of_birth', read_only=True)
    age = serializers.IntegerField(source='resident.age', read_only=True)
    resident_status = serializers.SerializerMethodField()
    voter_status = serializers.SerializerMethodField()

    class Meta:
        model = HouseholdMembership
        fields = (
            'id', 'resident_id', 'resident_code', 'full_name', 'photo_url', 'sex',
            'birth_date', 'age', 'resident_status', 'relationship_to_head',
            'status', 'joined_date', 'left_date', 'voter_status',
        )

    def get_photo_url(self, obj):
        return None

    def get_resident_status(self, obj):
        return 'active' if obj.resident.is_active else 'inactive'

    def get_voter_status(self, obj):
        return bool(obj.resident.voters_id.strip())


class HouseholdListSerializer(serializers.ModelSerializer):
    head_resident_id = serializers.IntegerField(source='household_head_id', read_only=True)
    head_full_name = serializers.CharField(source='household_head.full_name', read_only=True)
    zone = serializers.CharField(source='purok', read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Household
        fields = (
            'id', 'household_number', 'head_resident_id', 'head_full_name', 'zone',
            'purok', 'complete_address', 'status', 'member_count', 'house_ownership',
            'total_monthly_income', 'created_at', 'updated_at',
        )

    def get_member_count(self, obj):
        return obj.memberships.filter(status=HouseholdMembership.Status.ACTIVE).exclude(
            resident_id=obj.household_head_id
        ).count()


class HouseholdDetailSerializer(serializers.ModelSerializer):
    head_of_household = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    statistics = serializers.SerializerMethodField()
    eligible_new_heads = serializers.SerializerMethodField()

    class Meta:
        model = Household
        fields = (
            'id', 'household_number', 'head_of_household', 'complete_address', 'purok',
            'status', 'notes', 'house_ownership', 'total_monthly_income', 'created_at',
            'updated_at', 'members', 'eligible_new_heads', 'statistics',
        )

    def get_head_of_household(self, obj):
        return {
            'resident_id': obj.household_head_id,
            'resident_code': obj.household_head.qr_code,
            'full_name': obj.household_head.full_name,
        }

    def get_members(self, obj):
        memberships = obj.memberships.filter(status=HouseholdMembership.Status.ACTIVE).select_related('resident')
        return HouseholdMemberSerializer(memberships, many=True, context=self.context).data

    def get_eligible_new_heads(self, obj):
        memberships = (
            obj.memberships
            .filter(status=HouseholdMembership.Status.ACTIVE, resident__is_active=True)
            .exclude(resident_id=obj.household_head_id)
            .select_related('resident')
        )
        return HouseholdMemberSerializer(memberships, many=True, context=self.context).data

    def get_statistics(self, obj):
        return household_statistics(obj)


class HouseholdWriteSerializer(serializers.ModelSerializer):
    household_head_id = serializers.PrimaryKeyRelatedField(
        source='household_head',
        queryset=Resident.objects.all(),
        write_only=True,
        required=True,
    )

    class Meta:
        model = Household
        fields = (
            'household_number', 'household_head_id', 'complete_address', 'purok', 'status',
            'notes', 'house_ownership', 'total_monthly_income',
        )
        extra_kwargs = {'household_number': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        if 'status' in attrs:
            raise serializers.ValidationError(
                {'status': 'Use the archive endpoint to change household status.'}
            )
        return attrs

    def create(self, validated_data):
        household_head = validated_data.pop('household_head')
        try:
            return create_household(household_head=household_head, **validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

    def update(self, instance, validated_data):
        validated_data.pop('household_head', None)
        return super().update(instance, validated_data)


class HouseholdUpdateSerializer(HouseholdWriteSerializer):
    household_head_id = serializers.PrimaryKeyRelatedField(
        source='household_head', queryset=Resident.objects.all(), write_only=True, required=False
    )

    def validate(self, attrs):
        if 'household_head' in attrs:
            raise serializers.ValidationError(
                {'household_head_id': 'Use the change-head endpoint to change the household head.'}
            )
        return super().validate(attrs)
