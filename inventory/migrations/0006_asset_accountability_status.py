from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0005_category_choices_office_supplies_and_security_label'),
    ]

    operations = [
        migrations.AddField(
            model_name='asset',
            name='accountability_status',
            field=models.CharField(
                blank=True,
                choices=[('par', 'PAR'), ('ics', 'ICS')],
                default='',
                max_length=10,
            ),
        ),
    ]
