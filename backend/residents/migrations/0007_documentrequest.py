from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('residents', '0006_alter_resident_citizenship_default'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tracking_number', models.CharField(editable=False, max_length=20, unique=True)),
                ('full_name', models.CharField(max_length=150)),
                ('contact_number', models.CharField(max_length=15)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('address', models.CharField(max_length=255)),
                ('document_type', models.CharField(choices=[('barangay_clearance', 'Barangay Clearance'), ('certificate_of_residency', 'Certificate of Residency'), ('certificate_of_indigency', 'Certificate of Indigency'), ('business_clearance', 'Business Clearance')], max_length=50)),
                ('purpose', models.TextField()),
                ('preferred_release_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('ready_for_pickup', 'Ready for Pickup'), ('released', 'Released'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('remarks', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('processed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_document_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
