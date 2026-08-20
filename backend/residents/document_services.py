from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import DocumentRequest, DocumentRequestStatusHistory, Resident


STATUS_TRANSITIONS = {
    'pending': {'processing', 'rejected', 'cancelled'},
    'processing': {'ready_for_pickup', 'rejected', 'cancelled'},
    'ready_for_pickup': {'released', 'cancelled'},
    'released': set(),
    'rejected': set(),
    'cancelled': set(),
}

PRINT_ROUTE_BY_TYPE = {
    'certificate_of_residency': 'certificate-of-residency',
    'certificate_of_indigency': 'certificate-of-indigency',
    'barangay_clearance': 'barangay-clearance',
    'business_clearance': 'business-clearance',
}


def resident_document_warnings(resident):
    warnings = []
    if not resident.contact_number:
        warnings.append('Resident contact number is missing.')
    if not resident.house_number or not resident.street:
        warnings.append('Resident address is incomplete.')
    if resident.date_of_birth.year == 1900:
        warnings.append('Resident birth date still uses the legacy placeholder.')
    return warnings


def authoritative_portal_request_data(*, data, submitted_by):
    payload = data.copy()
    resident = Resident.objects.filter(portal_user=submitted_by, is_active=True).first()
    if resident:
        payload['full_name'] = resident.full_name
        payload['contact_number'] = resident.contact_number.strip()[:15]
        payload['email'] = (resident.email or '').strip()
        payload['address'] = resident.complete_address[:255]
    return payload


@transaction.atomic
def create_resident_document_request(*, resident, document_type, purpose, created_by, source, remarks=''):
    resident = Resident.objects.select_for_update().get(pk=resident.pk)
    if not resident.is_active:
        raise ValidationError({'resident': 'Document requests require an active resident record.'})
    if document_type not in dict(DocumentRequest.DOCUMENT_TYPE_CHOICES):
        raise ValidationError({'document_type': 'Invalid document type selected.'})
    purpose = (purpose or '').strip()
    if not purpose:
        raise ValidationError({'purpose': 'Purpose is required.'})
    warnings = resident_document_warnings(resident)
    if warnings:
        raise ValidationError({'resident': warnings})

    document = DocumentRequest.objects.create(
        resident=resident,
        created_by=created_by,
        request_source=source,
        full_name=resident.full_name,
        contact_number=resident.contact_number.strip()[:15],
        email=(resident.email or '').strip(),
        address=resident.complete_address[:255],
        document_type=document_type,
        purpose=purpose,
        remarks=(remarks or '').strip(),
    )
    DocumentRequestStatusHistory.objects.create(
        document_request=document,
        from_status='',
        to_status=document.status,
        changed_by=created_by,
        remarks='Request created from Resident Profile.' if source == 'profile' else 'Request created.',
    )
    return document


@transaction.atomic
def save_portal_document_request(*, document, submitted_by):
    resident = Resident.objects.filter(portal_user=submitted_by, is_active=True).first()
    document.submitted_by = submitted_by
    document.resident = resident
    document.request_source = DocumentRequest.RequestSource.PORTAL

    if resident:
        document.full_name = resident.full_name
        document.contact_number = resident.contact_number.strip()[:15]
        document.email = (resident.email or '').strip()
        document.address = resident.complete_address[:255]
    else:
        if not document.email:
            document.email = (submitted_by.email or '').strip()
        if not document.full_name.strip():
            document.full_name = submitted_by.get_full_name() or submitted_by.username

    document.save()
    DocumentRequestStatusHistory.objects.create(
        document_request=document,
        from_status='',
        to_status=document.status,
        changed_by=submitted_by,
        remarks='Request created from Resident Portal.',
    )
    return document


@transaction.atomic
def transition_document_request(*, document, new_status, changed_by, remarks=''):
    document = DocumentRequest.objects.select_for_update().get(pk=document.pk)
    if new_status not in dict(DocumentRequest.STATUS_CHOICES):
        raise ValidationError({'status': 'Invalid status selected.'})
    if new_status not in STATUS_TRANSITIONS.get(document.status, set()):
        raise ValidationError({'status': f'Cannot change status from {document.status} to {new_status}.'})

    previous = document.status
    now = timezone.now()
    document.status = new_status
    document.remarks = (remarks or '').strip()
    document.processed_by = changed_by
    if new_status == 'ready_for_pickup' and not document.approved_at:
        document.approved_at = now
    if new_status == 'released':
        document.released_at = now
    document.save()
    DocumentRequestStatusHistory.objects.create(
        document_request=document,
        from_status=previous,
        to_status=new_status,
        changed_by=changed_by,
        remarks=document.remarks,
    )
    return document


def available_document_transitions(document):
    return sorted(STATUS_TRANSITIONS.get(document.status, set()))


def document_print_path(document):
    slug = PRINT_ROUTE_BY_TYPE.get(document.document_type)
    return f'/residents/documents/{slug}/sample/{document.id}/' if slug else None
