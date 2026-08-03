import uuid

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import FamilyRelationship, Resident


RECIPROCAL_TYPES = {
    FamilyRelationship.RelationshipType.PARENT: FamilyRelationship.RelationshipType.CHILD,
    FamilyRelationship.RelationshipType.CHILD: FamilyRelationship.RelationshipType.PARENT,
    FamilyRelationship.RelationshipType.SPOUSE: FamilyRelationship.RelationshipType.SPOUSE,
    FamilyRelationship.RelationshipType.SIBLING: FamilyRelationship.RelationshipType.SIBLING,
    FamilyRelationship.RelationshipType.GUARDIAN: FamilyRelationship.RelationshipType.WARD,
    FamilyRelationship.RelationshipType.WARD: FamilyRelationship.RelationshipType.GUARDIAN,
}


def _would_create_ancestry_cycle(parent_id, child_id):
    """Return True when the proposed parent is already below the child."""
    frontier = {child_id}
    visited = set()
    while frontier:
        if parent_id in frontier:
            return True
        visited.update(frontier)
        frontier = set(
            FamilyRelationship.objects.filter(
                from_resident_id__in=frontier,
                relationship_type=FamilyRelationship.RelationshipType.PARENT,
                status=FamilyRelationship.Status.ACTIVE,
            ).exclude(to_resident_id__in=visited).values_list('to_resident_id', flat=True)
        )
    return False


def validate_relationship(*, from_resident, to_resident, relationship_type):
    if from_resident.pk == to_resident.pk:
        raise ValidationError({'to_resident_id': 'A resident cannot be related to themselves.'})
    if not from_resident.is_active or not to_resident.is_active:
        raise ValidationError({'to_resident_id': 'Both residents must be active.'})
    if relationship_type not in RECIPROCAL_TYPES:
        raise ValidationError({'relationship_type': 'Invalid relationship type.'})
    if FamilyRelationship.objects.filter(
        from_resident=from_resident,
        to_resident=to_resident,
        status=FamilyRelationship.Status.ACTIVE,
    ).exists():
        raise ValidationError({'to_resident_id': 'An active relationship already exists between these residents.'})
    if relationship_type == FamilyRelationship.RelationshipType.SPOUSE:
        if FamilyRelationship.objects.filter(
            from_resident__in=[from_resident, to_resident],
            relationship_type=FamilyRelationship.RelationshipType.SPOUSE,
            status=FamilyRelationship.Status.ACTIVE,
        ).exists():
            raise ValidationError({'relationship_type': 'One of these residents already has an active spouse relationship.'})

    if relationship_type == FamilyRelationship.RelationshipType.PARENT:
        parent_id, child_id = from_resident.pk, to_resident.pk
    elif relationship_type == FamilyRelationship.RelationshipType.CHILD:
        parent_id, child_id = to_resident.pk, from_resident.pk
    else:
        return
    if _would_create_ancestry_cycle(parent_id, child_id):
        raise ValidationError({'relationship_type': 'This parent-child relationship would create an ancestry cycle.'})


@transaction.atomic
def create_reciprocal_relationship(*, from_resident, to_resident, relationship_type, created_by, notes=''):
    resident_ids = sorted([from_resident.pk, to_resident.pk])
    locked = {
        resident.pk: resident
        for resident in Resident.objects.select_for_update().filter(pk__in=resident_ids)
    }
    from_resident = locked[from_resident.pk]
    to_resident = locked[to_resident.pk]
    FamilyRelationship.objects.select_for_update().filter(
        from_resident_id__in=resident_ids,
        to_resident_id__in=resident_ids,
    ).count()
    validate_relationship(
        from_resident=from_resident,
        to_resident=to_resident,
        relationship_type=relationship_type,
    )

    pair_id = uuid.uuid4()
    forward = FamilyRelationship.objects.create(
        pair_id=pair_id,
        from_resident=from_resident,
        to_resident=to_resident,
        relationship_type=relationship_type,
        notes=notes,
        created_by=created_by,
    )
    FamilyRelationship.objects.create(
        pair_id=pair_id,
        from_resident=to_resident,
        to_resident=from_resident,
        relationship_type=RECIPROCAL_TYPES[relationship_type],
        notes=notes,
        created_by=created_by,
    )
    return forward


@transaction.atomic
def deactivate_reciprocal_relationship(*, relationship, resident):
    relationships = list(
        FamilyRelationship.objects.select_for_update().filter(
            pair_id=relationship.pair_id,
            status=FamilyRelationship.Status.ACTIVE,
        )
    )
    if not any(item.from_resident_id == resident.pk for item in relationships):
        raise ValidationError({'detail': 'Relationship does not belong to this resident.'})
    if len(relationships) != 2:
        raise ValidationError({'detail': 'The reciprocal relationship pair is incomplete.'})
    FamilyRelationship.objects.filter(pk__in=[item.pk for item in relationships]).update(
        status=FamilyRelationship.Status.INACTIVE
    )


def resident_node(resident):
    return {
        'resident_id': resident.id,
        'full_name': resident.full_name,
        'gender': resident.gender,
        'age': resident.age,
        'is_active': resident.is_active,
    }


def family_tree_for(resident):
    relationships = resident.family_relationships_from.filter(
        status=FamilyRelationship.Status.ACTIVE
    ).select_related('to_resident')
    groups = {key: [] for key in ('parents', 'guardians', 'spouses', 'siblings', 'children', 'wards')}
    group_by_type = {
        FamilyRelationship.RelationshipType.CHILD: 'parents',
        FamilyRelationship.RelationshipType.WARD: 'guardians',
        FamilyRelationship.RelationshipType.SPOUSE: 'spouses',
        FamilyRelationship.RelationshipType.SIBLING: 'siblings',
        FamilyRelationship.RelationshipType.PARENT: 'children',
        FamilyRelationship.RelationshipType.GUARDIAN: 'wards',
    }
    for relationship in relationships:
        node = resident_node(relationship.to_resident)
        node['relationship_id'] = relationship.id
        node['relationship_type'] = relationship.relationship_type
        groups[group_by_type[relationship.relationship_type]].append(node)
    return {'resident': resident_node(resident), **groups}
