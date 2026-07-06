from django.db.models import Count

from inventory.models import Asset, Category


def normalize_text(value):
    if value is None:
        return ''
    return ' '.join(str(value).strip().lower().replace('_', ' ').replace('-', ' ').split())


def build_inventory_legacy_audit(limit=50):
    limit = max(1, int(limit or 50))

    category_choice_keys = {choice for choice, _label in Category.NameChoices.choices}
    location_choice_keys = {choice for choice, _label in Asset.LocationChoices.choices}
    condition_choice_keys = {choice for choice, _label in Asset.ConditionChoices.choices}

    category_suggestions = {
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

    location_suggestions = {
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

    condition_suggestions = {
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

    sections = [
        {
            'title': 'Category.name',
            'field': 'name',
            'rows': Category.objects.values('name').annotate(total=Count('id')).order_by('-total', 'name'),
            'valid_keys': category_choice_keys,
            'suggestions': category_suggestions,
        },
        {
            'title': 'Asset.location',
            'field': 'location',
            'rows': Asset.objects.values('location').annotate(total=Count('id')).order_by('-total', 'location'),
            'valid_keys': location_choice_keys,
            'suggestions': location_suggestions,
        },
        {
            'title': 'Asset.condition',
            'field': 'condition',
            'rows': Asset.objects.values('condition').annotate(total=Count('id')).order_by('-total', 'condition'),
            'valid_keys': condition_choice_keys,
            'suggestions': condition_suggestions,
        },
    ]

    result_sections = []
    total_unmatched = 0
    for section in sections:
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
                }
            )

        total_unmatched += len(unmatched)
        result_sections.append(
            {
                'title': section['title'],
                'unmatched_count': len(unmatched),
                'rows': unmatched[:limit],
                'remaining_count': max(0, len(unmatched) - limit),
            }
        )

    return {
        'sections': result_sections,
        'total_unmatched': total_unmatched,
        'limit': limit,
    }
