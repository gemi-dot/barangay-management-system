from django.db import migrations, models


def ensure_requested_categories(apps, schema_editor):
    Category = apps.get_model('inventory', 'Category')

    legacy_to_standard = {
        'office supplies': 'office_supplies',
        'office_supplies': 'office_supplies',
        'office supplies and consumables': 'office_supplies',
    }

    for legacy, standard in legacy_to_standard.items():
        Category.objects.filter(name=legacy).update(name=standard)

    required = [
        'office_supplies',
        'sports_equipment',
        'electrical_equipment',
        'safety_equipment',
    ]
    for category_name in required:
        Category.objects.get_or_create(name=category_name)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_normalize_legacy_inventory_values'),
    ]

    operations = [
        migrations.AlterField(
            model_name='category',
            name='name',
            field=models.CharField(
                choices=[
                    ('ict_equipment', 'ICT Equipment'),
                    ('office_furniture', 'Office Furniture'),
                    ('office_equipment', 'Office Equipment'),
                    ('office_supplies', 'Office Supplies'),
                    ('medical_equipment', 'Medical Equipment'),
                    ('disaster_equipment', 'Disaster Equipment'),
                    ('safety_equipment', 'Security/CCTV Equipment'),
                    ('communication_equipment', 'Communication Equipment'),
                    ('vehicle', 'Vehicle'),
                    ('heavy_equipment', 'Heavy Equipment'),
                    ('tools_and_equipment', 'Tools & Equipment'),
                    ('buildings', 'Buildings'),
                    ('infrastructure', 'Infrastructure'),
                    ('sports_equipment', 'Sports Equipment'),
                    ('electrical_equipment', 'Electrical Equipment'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.RunPython(ensure_requested_categories, noop_reverse),
    ]
