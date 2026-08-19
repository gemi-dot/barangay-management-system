import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from .models import (
    DocumentRequest, DocumentRequestStatusHistory, Resident, ResidentQrAuditEvent, ResidentQrIdentity,
)


class Phase2DocumentWorkflowTests(TestCase):
    def setUp(self):
        group, _ = Group.objects.get_or_create(name='Secretary')
        self.staff = get_user_model().objects.create_user(username='phase2-staff', password='pass')
        self.staff.groups.add(group)
        captain_group, _ = Group.objects.get_or_create(name='Captain')
        self.captain = get_user_model().objects.create_user(username='phase2-captain', password='pass')
        self.captain.groups.add(captain_group)
        self.resident = Resident.objects.create(
            first_name='Ana', last_name='Santos', date_of_birth='1990-02-03', gender='F',
            civil_status='married', contact_number='09171234567', house_number='12',
            street='Rizal Street', zone='Purok Talisay',
        )
        self.client.force_login(self.staff)

    def post_json(self, path, payload):
        return self.client.post(path, data=json.dumps(payload), content_type='application/json')

    def test_profile_creation_auto_selects_resident_and_snapshots_identity(self):
        response = self.post_json(
            f'/api/residents/{self.resident.id}/quick-document-request/',
            {'document_type': 'certificate_of_residency', 'purpose': 'Employment'},
        )
        self.assertEqual(response.status_code, 201)
        document = DocumentRequest.objects.get(tracking_number=response.json()['tracking_number'])
        self.assertEqual(document.resident, self.resident)
        self.assertEqual(document.full_name, self.resident.full_name)
        self.assertEqual(document.request_source, DocumentRequest.RequestSource.PROFILE)
        self.assertEqual(document.created_by, self.staff)
        self.assertEqual(document.status_history.count(), 1)

    def test_profile_creation_validates_required_and_incomplete_fields(self):
        missing_purpose = self.post_json(
            f'/api/residents/{self.resident.id}/quick-document-request/',
            {'document_type': 'certificate_of_residency', 'purpose': ''},
        )
        self.assertEqual(missing_purpose.status_code, 400)
        self.resident.contact_number = ''
        self.resident.save(update_fields=['contact_number'])
        incomplete = self.post_json(
            f'/api/residents/{self.resident.id}/quick-document-request/',
            {'document_type': 'certificate_of_residency', 'purpose': 'Employment'},
        )
        self.assertEqual(incomplete.status_code, 400)
        self.assertIn('contact', str(incomplete.json()).lower())

    def test_status_transitions_are_validated_and_audited(self):
        document = DocumentRequest.objects.create(
            resident=self.resident, full_name=self.resident.full_name,
            contact_number=self.resident.contact_number, address=self.resident.complete_address,
            document_type='barangay_clearance', purpose='Employment', request_source='profile',
        )
        invalid = self.post_json(f'/api/document-requests/{document.id}/status/', {'status': 'released'})
        self.assertEqual(invalid.status_code, 400)
        for status in ('processing', 'ready_for_pickup', 'released'):
            self.client.force_login(self.captain if status == 'ready_for_pickup' else self.staff)
            response = self.post_json(f'/api/document-requests/{document.id}/status/', {'status': status})
            self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertIsNotNone(document.approved_at)
        self.assertIsNotNone(document.released_at)
        self.assertEqual(DocumentRequestStatusHistory.objects.filter(document_request=document).count(), 3)
        self.assertEqual(response.json()['document_number'], document.tracking_number)
        self.assertIn(str(document.id), response.json()['print_url'])
        print_response = self.client.get(response.json()['print_url'])
        self.assertEqual(print_response.status_code, 200)

    def test_document_endpoints_reject_non_office_user(self):
        self.client.force_login(get_user_model().objects.create_user(username='ordinary', password='pass'))
        response = self.post_json(
            f'/api/residents/{self.resident.id}/quick-document-request/',
            {'document_type': 'barangay_clearance', 'purpose': 'Employment'},
        )
        self.assertEqual(response.status_code, 403)

    def test_portal_request_links_explicit_resident_and_shared_model(self):
        portal_user = get_user_model().objects.create_user(username='portal-phase2', password='pass')
        self.resident.portal_user = portal_user
        self.resident.save(update_fields=['portal_user'])
        self.client.force_login(portal_user)
        response = self.post_json('/api/portal/requests/create/', {
            'full_name': self.resident.full_name, 'contact_number': self.resident.contact_number,
            'email': '', 'address': self.resident.complete_address,
            'document_type': 'certificate_of_indigency', 'purpose': 'Assistance',
        })
        self.assertEqual(response.status_code, 201)
        document = DocumentRequest.objects.get(tracking_number=response.json()['tracking_number'])
        self.assertEqual(document.resident, self.resident)
        self.assertEqual(document.request_source, DocumentRequest.RequestSource.PORTAL)


class Phase2QrWorkflowTests(TestCase):
    def setUp(self):
        group, _ = Group.objects.get_or_create(name='Secretary')
        self.staff = get_user_model().objects.create_user(username='qr-phase2', password='pass')
        self.staff.groups.add(group)
        captain_group, _ = Group.objects.get_or_create(name='Captain')
        self.captain = get_user_model().objects.create_user(username='qr-phase2-captain', password='pass')
        self.captain.groups.add(captain_group)
        self.resident = Resident.objects.create(
            first_name='Lito', last_name='Cruz', date_of_birth='1985-01-01', gender='M',
        )
        self.client.force_login(self.staff)

    def post_json(self, path, payload=None):
        return self.client.post(path, data=json.dumps(payload or {}), content_type='application/json')

    def test_issue_reuses_existing_active_identity_and_audits_issue(self):
        first = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/')
        second = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()['identifier'], second.json()['identifier'])
        self.assertEqual(ResidentQrIdentity.objects.filter(resident=self.resident, status='active').count(), 1)
        self.assertTrue(ResidentQrAuditEvent.objects.filter(event_type='issued').exists())
        print_response = self.client.get(f'/residents/documents/barangay-id/sample/{self.resident.id}/')
        self.assertEqual(print_response.status_code, 200)
        self.assertTrue(ResidentQrAuditEvent.objects.filter(event_type='printed').exists())

    def test_public_verification_is_safe_and_logs_result(self):
        identifier = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').json()['identifier']
        self.client.logout()
        response = self.client.get(f'/api/qr/verify/{identifier}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['valid'])
        self.assertNotIn('resident_id', response.json())
        self.assertNotIn('contact_number', response.json())
        self.assertTrue(ResidentQrAuditEvent.objects.filter(event_type='verified', result='valid').exists())

    def test_unknown_and_inactive_verification_states(self):
        unknown = self.client.get('/api/qr/verify/DOESNOTEXIST1234/')
        self.assertEqual(unknown.json()['status'], 'unknown')
        identifier = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').json()['identifier']
        self.resident.is_active = False
        self.resident.save(update_fields=['is_active'])
        inactive = self.client.get(f'/api/qr/verify/{identifier}/')
        self.assertEqual(inactive.json()['status'], 'inactive_resident')

    def test_transferred_deceased_and_archived_verification_states(self):
        identifier = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').json()['identifier']
        for residency_status, expected in (
            ('transferred', 'transferred_resident'),
            ('deceased', 'deceased_resident'),
            ('archived', 'archived_resident'),
        ):
            self.resident.residency_status = residency_status
            self.resident.is_active = False
            self.resident.save(update_fields=['residency_status', 'is_active'])
            self.assertEqual(self.client.get(f'/api/qr/verify/{identifier}/').json()['status'], expected)

    def test_reissue_supersedes_old_identifier_and_requires_reason(self):
        old_identifier = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').json()['identifier']
        self.client.force_login(self.captain)
        missing = self.post_json(f'/api/residents/{self.resident.id}/qr/reissue/')
        self.assertEqual(missing.status_code, 400)
        replacement = self.post_json(f'/api/residents/{self.resident.id}/qr/reissue/', {'reason': 'Lost ID'})
        self.assertEqual(replacement.status_code, 201)
        self.assertNotEqual(replacement.json()['identifier'], old_identifier)
        self.assertEqual(self.client.get(f'/api/qr/verify/{old_identifier}/').json()['status'], 'reissued')
        self.assertTrue(self.client.get(f"/api/qr/verify/{replacement.json()['identifier']}/").json()['valid'])

    def test_revocation_requires_reason_and_prevents_valid_verification(self):
        identifier = self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').json()['identifier']
        self.client.force_login(self.captain)
        self.assertEqual(self.post_json(f'/api/residents/{self.resident.id}/qr/revoke/').status_code, 400)
        revoked = self.post_json(f'/api/residents/{self.resident.id}/qr/revoke/', {'reason': 'Security concern'})
        self.assertEqual(revoked.status_code, 200)
        verification = self.client.get(f'/api/qr/verify/{identifier}/').json()
        self.assertFalse(verification['valid'])
        self.assertEqual(verification['status'], 'revoked')

    def test_qr_mutations_reject_non_office_user(self):
        self.client.force_login(get_user_model().objects.create_user(username='qr-ordinary', password='pass'))
        self.assertEqual(self.post_json(f'/api/residents/{self.resident.id}/qr/issue/').status_code, 403)
