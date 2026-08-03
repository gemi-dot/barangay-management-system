from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Household, HouseholdMembership, Resident


def _active_membership_for_update(resident):
    return (
        HouseholdMembership.objects.select_for_update()
        .select_related('household')
        .filter(resident=resident, status=HouseholdMembership.Status.ACTIVE)
        .first()
    )


@transaction.atomic
def create_household(*, household_head, **household_data):
    Resident.objects.select_for_update().get(pk=household_head.pk)
    if _active_membership_for_update(household_head):
        raise ValidationError({'household_head': 'This resident already belongs to an active household.'})

    household_data.setdefault('purok', household_head.zone or '')
    household_data.setdefault('complete_address', household_head.complete_address)
    household = Household.objects.create(household_head=household_head, **household_data)
    HouseholdMembership.objects.create(
        household=household,
        resident=household_head,
        relationship_to_head=HouseholdMembership.Relationship.HEAD,
    )
    return household


@transaction.atomic
def add_household_member(*, household, resident, relationship_to_head, move=False):
    household = Household.objects.select_for_update().get(pk=household.pk)
    Resident.objects.select_for_update().get(pk=resident.pk)
    existing = _active_membership_for_update(resident)

    if existing:
        if existing.household_id == household.pk:
            raise ValidationError({'resident': 'This resident is already an active household member.'})
        if not move:
            raise ValidationError({'resident': 'This resident already belongs to another active household.'})
        if existing.relationship_to_head == HouseholdMembership.Relationship.HEAD:
            raise ValidationError({'resident': 'A household head cannot be moved without selecting a replacement head.'})
        existing.status = HouseholdMembership.Status.TRANSFERRED
        existing.left_date = timezone.localdate()
        existing.save(update_fields=['status', 'left_date', 'updated_at'])

    membership = (
        HouseholdMembership.objects.select_for_update()
        .filter(household=household, resident=resident)
        .exclude(status=HouseholdMembership.Status.ACTIVE)
        .order_by('-created_at')
        .first()
    )
    if membership:
        membership.relationship_to_head = relationship_to_head
        membership.status = HouseholdMembership.Status.ACTIVE
        membership.joined_date = timezone.localdate()
        membership.left_date = None
        membership.save(
            update_fields=['relationship_to_head', 'status', 'joined_date', 'left_date', 'updated_at']
        )
        return membership

    return HouseholdMembership.objects.create(
        household=household,
        resident=resident,
        relationship_to_head=relationship_to_head,
    )


@transaction.atomic
def remove_household_member(*, household, resident):
    household = Household.objects.select_for_update().get(pk=household.pk)
    membership = (
        HouseholdMembership.objects.select_for_update()
        .filter(
            household=household,
            resident=resident,
            status=HouseholdMembership.Status.ACTIVE,
        )
        .first()
    )
    if not membership:
        raise ValidationError({'resident': 'This resident is not an active member of the household.'})
    if household.household_head_id == resident.pk or membership.relationship_to_head == HouseholdMembership.Relationship.HEAD:
        raise ValidationError({'resident': 'The household head cannot be removed without first selecting another head.'})

    membership.status = HouseholdMembership.Status.INACTIVE
    membership.left_date = timezone.localdate()
    membership.save(update_fields=['status', 'left_date', 'updated_at'])
    return membership


@transaction.atomic
def change_household_head(*, household, new_head, previous_head_relationship):
    household = Household.objects.select_for_update().get(pk=household.pk)
    if household.household_head_id == new_head.pk:
        raise ValidationError({'new_head': 'Select a different active household member as the new head.'})

    valid_relationships = {
        value for value, _ in HouseholdMembership.Relationship.choices
        if value != HouseholdMembership.Relationship.HEAD
    }
    if previous_head_relationship not in valid_relationships:
        raise ValidationError({'previous_head_relationship': 'Select a valid non-head relationship.'})

    Resident.objects.select_for_update().filter(pk__in=[household.household_head_id, new_head.pk]).count()
    new_membership = (
        HouseholdMembership.objects.select_for_update()
        .filter(
            household=household,
            resident=new_head,
            status=HouseholdMembership.Status.ACTIVE,
        )
        .first()
    )
    if not new_membership:
        raise ValidationError({'new_head': 'The new household head must already be an active member of this household.'})
    if not new_head.is_active:
        raise ValidationError({'new_head': 'The new household head must be an active resident.'})

    previous_membership = HouseholdMembership.objects.select_for_update().get(
        household=household,
        resident_id=household.household_head_id,
        status=HouseholdMembership.Status.ACTIVE,
    )
    previous_membership.relationship_to_head = previous_head_relationship
    previous_membership.save(update_fields=['relationship_to_head', 'updated_at'])
    new_membership.relationship_to_head = HouseholdMembership.Relationship.HEAD
    new_membership.save(update_fields=['relationship_to_head', 'updated_at'])
    household.household_head = new_head
    household.save(update_fields=['household_head', 'updated_at'])
    return household
