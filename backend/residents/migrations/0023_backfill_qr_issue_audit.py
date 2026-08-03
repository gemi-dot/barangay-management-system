from django.db import migrations


def backfill_qr_issue_audit(apps, schema_editor):
    ResidentQrIdentity = apps.get_model('residents', 'ResidentQrIdentity')
    ResidentQrAuditEvent = apps.get_model('residents', 'ResidentQrAuditEvent')
    existing_identity_ids = set(
        ResidentQrAuditEvent.objects.filter(event_type='issued').values_list('identity_id', flat=True)
    )
    ResidentQrAuditEvent.objects.bulk_create([
        ResidentQrAuditEvent(
            identity_id=identity.id,
            resident_id=identity.resident_id,
            event_type='issued',
            result=identity.status,
            remarks='Legacy QR identity registered during Phase 2 migration.',
            created_at=identity.issued_at,
        )
        for identity in ResidentQrIdentity.objects.all()
        if identity.id not in existing_identity_ids
    ])


class Migration(migrations.Migration):
    dependencies = [('residents', '0022_documentrequest_approved_at_and_more')]

    operations = [
        migrations.RunPython(backfill_qr_issue_audit, migrations.RunPython.noop),
    ]
