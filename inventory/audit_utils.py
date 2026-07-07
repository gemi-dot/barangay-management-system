from django.db import transaction
from django.db.models import Count

from inventory.models import Asset, Category


def normalize_text(value):
    if value is None:
        return ''
    return ' '.join(str(value).strip().lower().replace('_', ' ').replace('-', ' ').split())


CATEGORY_SUGGESTIONS = {
    'ict equipment': 'ict_equipment',
    'ict': 'ict_equipment',
    'furniture': 'office_furniture',
    'office furniture': 'office_furniture',
    'office supplies': 'office_equipment',
    'office equipment': 'office_equipment',
    'medical equipment': 'medical_equipment',
    'drrm equipment': 'disaster_equipment',
    'disaster equipment': 'disaster_equipment',
    'vehicles': 'vehicle',
    'vehicle': 'vehicle',
    'heavy equipment': 'heavy_equipment',
    'tools and equipment': 'tools_and_equipment',
    'buildings': 'buildings',
    'infrastructure': 'infrastructure',
    'sports equipment': 'sports_equipment',
    'electrical equipment': 'electrical_equipment',
}

LOCATION_SUGGESTIONS = {
    'barangay hall': 'barangay_hall',
    'brgy hall': 'barangay_hall',
    'barangay office': 'barangay_office',
    'health center': 'health_center',
    'health centre': 'health_center',
    'multi purpose hall': 'multi_purpose_hall',
    'multipurpose hall': 'multi_purpose_hall',
    'covered court': 'covered_court',
    'session hall': 'session_hall',
    'drrm storage': 'drrm_storage',
    'records room': 'records_room',
    'storage room': 'storage_room',
    'garage': 'garage',
    'day care center': 'day_care_center',
    'day care centre': 'day_care_center',
    'senior citizen center': 'senior_citizen_center',
    'senior citizens center': 'senior_citizen_center',
    'senior citizen centre': 'senior_citizen_center',
}

CONDITION_SUGGESTIONS = {
    'brand new': 'excellent',
    'very good': 'very_good',
    'good': 'good',
    'fair': 'fair',
    'needs repair': 'poor',
    'poor': 'poor',
    'damaged': 'unserviceable',
    'unserviceable': 'unserviceable',
    'for disposal': 'for_disposal',
    'missing': 'for_disposal',
}


def _audit_section_specs():
    return [
        {
            'key': 'category',
            'title': 'Category.name',
            'field': 'name',
            'rows': Category.objects.values('name').annotate(total=Count('id')).order_by('-total', 'name'),
            'valid_keys': {choice for choice, _label in Category.NameChoices.choices},
            'suggestions': CATEGORY_SUGGESTIONS,
        },
        {
            'key': 'location',
            'title': 'Asset.location',
            'field': 'location',
            'rows': Asset.objects.values('location').annotate(total=Count('id')).order_by('-total', 'location'),
            'valid_keys': {choice for choice, _label in Asset.LocationChoices.choices},
            'suggestions': LOCATION_SUGGESTIONS,
        },
        {
            'key': 'condition',
            'title': 'Asset.condition',
            'field': 'condition',
            'rows': Asset.objects.values('condition').annotate(total=Count('id')).order_by('-total', 'condition'),
            'valid_keys': {choice for choice, _label in Asset.ConditionChoices.choices},
            'suggestions': CONDITION_SUGGESTIONS,
        },
    ]


def _section_rows(section, limit=None):
    unmatched = []
    for row in section['rows']:
        raw = row.get(section['field'])
        normalized = normalize_text(raw)
        normalized_key = normalized.replace(' ', '_')

        if raw in section['valid_keys'] or normalized_key in section['valid_keys']:
            continue

        unmatched.append(
            {
                'value': '' if raw is None else str(raw),
                'count': row['total'],
                'suggestion': section['suggestions'].get(normalized) or 'N/A',
                'section_key': section['key'],
            }
        )

    if limit is None:
        limited_rows = unmatched
    else:
        limited_rows = unmatched[:limit]

    return {
        'key': section['key'],
        'title': section['title'],
        'unmatched_count': len(unmatched),
        'rows': limited_rows,
        'remaining_count': max(0, len(unmatched) - len(limited_rows)),
    }


def build_inventory_legacy_audit(limit=50):
    limit = max(1, int(limit or 50))

    result_sections = []
    total_unmatched = 0
    for section in _audit_section_specs():
        section_result = _section_rows(section, limit=limit)
        total_unmatched += section_result['unmatched_count']
        result_sections.append(section_result)

    return {
        'sections': result_sections,
        'total_unmatched': total_unmatched,
        'limit': limit,
    }


def export_inventory_legacy_audit_rows():
    exported_rows = []
    for section in _audit_section_specs():
        section_result = _section_rows(section, limit=None)
        for row in section_result['rows']:
            exported_rows.append(
                {
                    'section': section_result['title'],
                    'section_key': section_result['key'],
                    'value': row['value'],
                    'count': row['count'],
                    'suggestion': row['suggestion'],
                }
            )
    return exported_rows


@transaction.atomic
def apply_inventory_legacy_fix(section_key, raw_value):
    normalized = normalize_text(raw_value)

    if section_key == 'category':
        suggestion = CATEGORY_SUGGESTIONS.get(normalized)
        if not suggestion:
            return {'updated': 0, 'suggestion': 'N/A'}

        categories = list(Category.objects.filter(name=raw_value))
        if not categories:
            return {'updated': 0, 'suggestion': suggestion}

        target_category, _ = Category.objects.get_or_create(name=suggestion, defaults={'description': ''})
        updated = 0
        for category in categories:
            if category.pk == target_category.pk:
                continue

            reassigned = Asset.objects.filter(category=category).update(category=target_category)
            updated += reassigned
            category.delete()

        return {'updated': updated, 'suggestion': suggestion}

    if section_key == 'location':
        suggestion = LOCATION_SUGGESTIONS.get(normalized)
        if not suggestion:
            return {'updated': 0, 'suggestion': 'N/A'}

        updated = Asset.objects.filter(location=raw_value).update(location=suggestion)
        return {'updated': updated, 'suggestion': suggestion}

    if section_key == 'condition':
        suggestion = CONDITION_SUGGESTIONS.get(normalized)
        if not suggestion:
            return {'updated': 0, 'suggestion': 'N/A'}

        assets = list(Asset.objects.filter(condition=raw_value))
        updated = 0
        for asset in assets:
            update_fields = []
            if asset.condition != suggestion:
                asset.condition = suggestion
                update_fields.append('condition')

            if normalized == 'missing' and asset.status != Asset.StatusChoices.LOST:
                asset.status = Asset.StatusChoices.LOST
                update_fields.append('status')

            if normalized in {'needs repair', 'damaged'} and asset.status == Asset.StatusChoices.ACTIVE:
                asset.status = Asset.StatusChoices.UNDER_REPAIR
                update_fields.append('status')

            if update_fields:
                asset.save(update_fields=update_fields)
                updated += 1

        return {'updated': updated, 'suggestion': suggestion}

    raise ValueError(f'Unknown audit section: {section_key}')
