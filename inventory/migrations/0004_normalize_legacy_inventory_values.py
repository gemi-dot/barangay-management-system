from django.db import migrations


def _normalize_text(value):
    if value is None:
        return ''
    return ' '.join(str(value).strip().lower().replace('_', ' ').replace('-', ' ').split())


def normalize_legacy_inventory_values(apps, schema_editor):
    Category = apps.get_model('inventory', 'Category')
    Asset = apps.get_model('inventory', 'Asset')

    category_map = {
        'ict equipment': 'ict_equipment',
        'ict': 'ict_equipment',
        'ict_equipment': 'ict_equipment',
        'furniture': 'office_furniture',
        'office furniture': 'office_furniture',
        'office_furniture': 'office_furniture',
        'office supplies': 'office_equipment',
        'office supplies and equipment': 'office_equipment',
        'office equipment': 'office_equipment',
        'office_equipment': 'office_equipment',
        'medical equipment': 'medical_equipment',
        'medical_equipment': 'medical_equipment',
        'drrm equipment': 'disaster_equipment',
        'disaster equipment': 'disaster_equipment',
        'drrm_equipment': 'disaster_equipment',
        'safety equipment': 'safety_equipment',
        'communication equipment': 'communication_equipment',
        'vehicle': 'vehicle',
        'vehicles': 'vehicle',
        'heavy equipment': 'heavy_equipment',
        'tools and equipment': 'tools_and_equipment',
        'tools equipment': 'tools_and_equipment',
        'buildings': 'buildings',
        'infrastructure': 'infrastructure',
        'sports equipment': 'sports_equipment',
        'electrical equipment': 'electrical_equipment',
    }

    location_map = {
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

    condition_map = {
        'brand new': 'excellent',
        'brand_new': 'excellent',
        'excellent': 'excellent',
        'very good': 'very_good',
        'very_good': 'very_good',
        'good': 'good',
        'fair': 'fair',
        'needs repair': 'poor',
        'needs_repair': 'poor',
        'poor': 'poor',
        'damaged': 'unserviceable',
        'unserviceable': 'unserviceable',
        'for disposal': 'for_disposal',
        'for_disposal': 'for_disposal',
    }

    # Normalize category values to the new standardized keys.
    for category in Category.objects.all():
        normalized = _normalize_text(category.name)
        mapped = category_map.get(normalized)
        if mapped and mapped != category.name:
            category.name = mapped
            category.save(update_fields=['name'])

    # Normalize asset location/condition values and infer status for legacy states.
    for asset in Asset.objects.all():
        update_fields = []

        normalized_location = _normalize_text(asset.location)
        mapped_location = location_map.get(normalized_location)
        if mapped_location and mapped_location != asset.location:
            asset.location = mapped_location
            update_fields.append('location')

        original_condition = _normalize_text(asset.condition)
        mapped_condition = condition_map.get(original_condition)
        if mapped_condition and mapped_condition != asset.condition:
            asset.condition = mapped_condition
            update_fields.append('condition')

        if original_condition == 'missing' and asset.status != 'lost':
            asset.status = 'lost'
            update_fields.append('status')

        if original_condition in {'needs repair', 'needs_repair', 'damaged'} and asset.status == 'active':
            asset.status = 'under_repair'
            update_fields.append('status')

        if update_fields:
            asset.save(update_fields=update_fields)


def noop_reverse(apps, schema_editor):
    # This normalization is intentionally one-way for data consistency.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_asset_responsible_role_alter_asset_condition_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_legacy_inventory_values, noop_reverse),
    ]
