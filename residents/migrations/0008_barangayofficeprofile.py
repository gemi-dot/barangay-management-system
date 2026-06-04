from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('residents', '0007_documentrequest'),
    ]

    operations = [
        migrations.CreateModel(
            name='BarangayOfficeProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('office_name', models.CharField(default='Barangay Abgao', max_length=150)),
                ('captain_name', models.CharField(default='HON. BARANGAY CAPTAIN', max_length=150)),
                ('default_or_number', models.CharField(blank=True, max_length=50)),
                ('default_control_number', models.CharField(blank=True, max_length=50)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Barangay Office Profile',
                'verbose_name_plural': 'Barangay Office Profile',
            },
        ),
    ]
