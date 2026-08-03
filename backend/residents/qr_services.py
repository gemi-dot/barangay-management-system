import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Resident, ResidentQrAuditEvent, ResidentQrIdentity


def _new_identifier():
    for _ in range(10):
        identifier = uuid.uuid4().hex[:16].upper()
        if not ResidentQrIdentity.objects.filter(identifier=identifier).exists():
            return identifier
    raise ValidationError({'detail': 'Unable to generate a unique QR identifier.'})


@transaction.atomic
def issue_qr_identity(*, resident, user):
    resident = Resident.objects.select_for_update().get(pk=resident.pk)
    active = ResidentQrIdentity.objects.select_for_update().filter(
        resident=resident, status=ResidentQrIdentity.Status.ACTIVE
    ).first()
    if active:
        return active, False
    identity = ResidentQrIdentity.objects.create(
        resident=resident, identifier=resident.qr_code or _new_identifier(), issued_by=user
    )
    ResidentQrAuditEvent.objects.create(
        identity=identity, resident=resident, event_type=ResidentQrAuditEvent.EventType.ISSUED,
        result='active', performed_by=user,
    )
    return identity, True


@transaction.atomic
def reissue_qr_identity(*, resident, user, reason):
    reason = (reason or '').strip()
    if not reason:
        raise ValidationError({'reason': 'A reissue reason is required.'})
    resident = Resident.objects.select_for_update().get(pk=resident.pk)
    current, _ = issue_qr_identity(resident=resident, user=user)
    current.status = ResidentQrIdentity.Status.REISSUED
    current.status_changed_at = timezone.now()
    current.status_changed_by = user
    current.reason = reason
    current.save(update_fields=['status', 'status_changed_at', 'status_changed_by', 'reason'])

    identifier = _new_identifier()
    replacement = ResidentQrIdentity.objects.create(
        resident=resident, identifier=identifier, issued_by=user
    )
    current.superseded_by = replacement
    current.save(update_fields=['superseded_by'])
    if resident.qr_image:
        resident.qr_image.delete(save=False)
    resident.qr_code = identifier
    resident.qr_image = None
    resident.save(update_fields=['qr_code', 'qr_image'])
    ResidentQrAuditEvent.objects.bulk_create([
        ResidentQrAuditEvent(identity=current, resident=resident, event_type='reissued', result='reissued', performed_by=user, remarks=reason),
        ResidentQrAuditEvent(identity=replacement, resident=resident, event_type='issued', result='active', performed_by=user, remarks='Replacement identity issued.'),
    ])
    return replacement


@transaction.atomic
def revoke_qr_identity(*, resident, user, reason):
    reason = (reason or '').strip()
    if not reason:
        raise ValidationError({'reason': 'A revocation reason is required.'})
    identity = ResidentQrIdentity.objects.select_for_update().filter(
        resident=resident, status=ResidentQrIdentity.Status.ACTIVE
    ).first()
    if not identity:
        raise ValidationError({'detail': 'No active QR identity exists.'})
    identity.status = ResidentQrIdentity.Status.REVOKED
    identity.status_changed_at = timezone.now()
    identity.status_changed_by = user
    identity.reason = reason
    identity.save(update_fields=['status', 'status_changed_at', 'status_changed_by', 'reason'])
    ResidentQrAuditEvent.objects.create(
        identity=identity, resident=resident, event_type='revoked', result='revoked',
        performed_by=user, remarks=reason,
    )
    return identity


def verification_result(identifier, *, user=None, source='public'):
    identity = ResidentQrIdentity.objects.select_related('resident').filter(identifier=identifier).first()
    if not identity:
        ResidentQrAuditEvent.objects.create(
            event_type='failed_verification', result='unknown', performed_by=user,
            remarks=f'Unknown QR verification from {source}.',
        )
        return {'status': 'unknown', 'valid': False}
    resident = identity.resident
    if identity.status != ResidentQrIdentity.Status.ACTIVE:
        status = identity.status
    elif not resident.is_active or resident.residency_status != Resident.ResidencyStatus.ACTIVE:
        status = {
            Resident.ResidencyStatus.TRANSFERRED: 'transferred_resident',
            Resident.ResidencyStatus.DECEASED: 'deceased_resident',
            Resident.ResidencyStatus.ARCHIVED: 'archived_resident',
        }.get(resident.residency_status, 'inactive_resident')
    else:
        status = 'valid'
    ResidentQrAuditEvent.objects.create(
        identity=identity, resident=resident, event_type='verified', result=status,
        performed_by=user, remarks=f'QR verification from {source}.',
    )
    return {
        'status': status,
        'valid': status == 'valid',
        'identifier': identity.identifier,
        'resident_name': resident.full_name,
        'barangay': resident.barangay,
        'residency_status': resident.residency_status if resident.residency_status != 'active' else ('active' if resident.is_active else 'inactive'),
        'qr_status': identity.status,
        'issued_at': identity.issued_at.isoformat(),
    }
