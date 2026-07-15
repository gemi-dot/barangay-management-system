from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('residents', '0008_barangayofficeprofile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resident',
            name='zone',
            field=models.CharField(
                choices=[
                    ('Purok Talisay', 'Purok Talisay'),
                    ('Purok Malunggay', 'Purok Malunggay'),
                    ('Purok Mancinitas', 'Purok Mancinitas'),
                    ('Purok Narra', 'Purok Narra'),
                    ('Purok Kulo', 'Purok Kulo'),
                    ('Purok Ipil-ipil', 'Purok Ipil-ipil'),
                ],
                max_length=50,
            ),
        ),
    ]
