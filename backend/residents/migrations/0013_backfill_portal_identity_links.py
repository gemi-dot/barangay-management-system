from django.db import migrations


def _normalize(value):
    return (value or '').strip().lower()


def _full_name(first_name, last_name):
    parts = [part.strip() for part in [first_name or '', last_name or ''] if part and part.strip()]
    return ' '.join(parts)


def backfill_portal_identity_links(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Resident = apps.get_model('residents', 'Resident')
    DocumentRequest = apps.get_model('residents', 'DocumentRequest')

    users = list(User.objects.all())
    user_by_email = {}
    user_by_name = {}
    user_by_username = {}

    for user in users:
        email = _normalize(user.email)
        if email:
            user_by_email.setdefault(email, []).append(user)

        name = _normalize(_full_name(user.first_name, user.last_name))
        if name:
            user_by_name.setdefault(name, []).append(user)

        username = _normalize(user.username)
        if username:
            user_by_username.setdefault(username, []).append(user)

    for resident in Resident.objects.filter(portal_user__isnull=True):
        candidates = []

        email = _normalize(resident.email)
        if email and len(user_by_email.get(email, [])) == 1:
            candidates = user_by_email[email]

        if not candidates:
            name = _normalize(_full_name(resident.first_name, resident.last_name))
            if name and len(user_by_name.get(name, [])) == 1:
                candidates = user_by_name[name]

        if not candidates:
            name = _normalize(_full_name(resident.first_name, resident.last_name))
            if name and len(user_by_name.get(name, [])) == 1:
                candidates = user_by_name[name]

        if not candidates:
            username = _normalize(_full_name(resident.first_name, resident.last_name))
            if username and len(user_by_username.get(username, [])) == 1:
                candidates = user_by_username[username]

        if len(candidates) == 1:
            resident.portal_user_id = candidates[0].id
            resident.save(update_fields=['portal_user'])

    for request in DocumentRequest.objects.filter(submitted_by__isnull=True):
        candidates = []
        email = _normalize(request.email)
        if email and len(user_by_email.get(email, [])) == 1:
            candidates = user_by_email[email]

        if not candidates:
            name = _normalize(request.full_name)
            if name and len(user_by_name.get(name, [])) == 1:
                candidates = user_by_name[name]

        if not candidates:
            username = _normalize(request.full_name)
            if username and len(user_by_username.get(username, [])) == 1:
                candidates = user_by_username[username]

        if len(candidates) == 1:
            request.submitted_by_id = candidates[0].id
            request.save(update_fields=['submitted_by'])


def reverse_backfill_portal_identity_links(apps, schema_editor):
    Resident = apps.get_model('residents', 'Resident')
    DocumentRequest = apps.get_model('residents', 'DocumentRequest')

    Resident.objects.filter(portal_user__isnull=False).update(portal_user=None)
    DocumentRequest.objects.filter(submitted_by__isnull=False).update(submitted_by=None)


class Migration(migrations.Migration):

    dependencies = [
        ('residents', '0012_resident_portal_user_documentrequest_submitted_by'),
    ]

    operations = [
        migrations.RunPython(backfill_portal_identity_links, reverse_backfill_portal_identity_links),
    ]