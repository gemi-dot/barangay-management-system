import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from accounts.capabilities import DOCUMENT_EXPORT, user_has_capability

from .models import DocumentRequest, Resident


class DocumentAndQrCapabilityMatrixTests(TestCase):
    password = 'testpass123'

    def setUp(self):
        self.users = {
            'ordinary': self._user('matrix-ordinary'),
            'secretary': self._role_user('matrix-secretary', 'Secretary'),
            'captain': self._role_user('matrix-captain', 'Captain'),
            'bhw': self._role_user('matrix-bhw', 'BHW'),
            'superuser': get_user_model().objects.create_superuser(
                username='matrix-superuser', password=self.password, email='root@example.com'
            ),
        }
        self.resident = Resident.objects.create(
            first_name='Capability', last_name='Resident', date_of_birth='1990-01-01',
            contact_number='09171234567', house_number='10', street='Rizal Street',
            zone='Purok Talisay',
        )

    def _user(self, username):
        return get_user_model().objects.create_user(username=username, password=self.password)

    def _role_user(self, username, role):
        user = self._user(username)
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)
        return user

    def _login(self, actor):
        self.client.logout()
        if actor != 'anonymous':
            self.client.force_login(self.users[actor])

    def _post(self, path, payload=None):
        return self.client.post(
            path, data=json.dumps(payload or {}), content_type='application/json'
        )

    def _document(self, status='pending'):
        return DocumentRequest.objects.create(
            resident=self.resident,
            full_name=self.resident.full_name,
            contact_number=self.resident.contact_number,
            address=self.resident.complete_address,
            document_type='barangay_clearance',
            purpose='Capability test',
            status=status,
        )

    def assert_allowed(self, response):
        self.assertLess(response.status_code, 400, response.content)

    def assert_denied(self, response):
        self.assertIn(response.status_code, {302, 401, 403}, response.content)

    def test_document_exact_role_matrix(self):
        expected = {
            'secretary': {'view', 'create', 'process', 'release', 'print', 'export'},
            'captain': {'view', 'approve', 'print', 'export'},
            'bhw': set(),
            'ordinary': set(),
            'anonymous': set(),
            'superuser': {'view', 'create', 'process', 'approve', 'release', 'print', 'export'},
        }

        for actor, allowed in expected.items():
            with self.subTest(actor=actor, action='view'):
                self._login(actor)
                response = self.client.get('/api/document-requests/')
                (self.assert_allowed if 'view' in allowed else self.assert_denied)(response)

            with self.subTest(actor=actor, action='create'):
                self._login(actor)
                response = self._post(
                    f'/api/residents/{self.resident.id}/quick-document-request/',
                    {'document_type': 'barangay_clearance', 'purpose': 'Employment'},
                )
                (self.assert_allowed if 'create' in allowed else self.assert_denied)(response)

            transitions = {
                'process': ('pending', 'processing'),
                'approve': ('processing', 'ready_for_pickup'),
                'release': ('ready_for_pickup', 'released'),
            }
            for action_name, (from_status, to_status) in transitions.items():
                with self.subTest(actor=actor, action=action_name):
                    document = self._document(from_status)
                    self._login(actor)
                    response = self._post(
                        f'/api/document-requests/{document.id}/status/', {'status': to_status}
                    )
                    (self.assert_allowed if action_name in allowed else self.assert_denied)(response)

            with self.subTest(actor=actor, action='print'):
                document = self._document()
                self._login(actor)
                response = self.client.get(
                    f'/residents/documents/barangay-clearance/sample/{document.id}/'
                )
                (self.assert_allowed if 'print' in allowed else self.assert_denied)(response)

            if actor != 'anonymous':
                with self.subTest(actor=actor, action='export'):
                    self.assertEqual(
                        user_has_capability(self.users[actor], DOCUMENT_EXPORT),
                        'export' in allowed,
                    )

    def test_reject_and_cancel_require_document_process(self):
        for actor, allowed in {'secretary': True, 'captain': False, 'bhw': False, 'superuser': True}.items():
            for target in ('rejected', 'cancelled'):
                with self.subTest(actor=actor, target=target):
                    document = self._document('pending')
                    self._login(actor)
                    response = self._post(
                        f'/api/document-requests/{document.id}/status/', {'status': target}
                    )
                    (self.assert_allowed if allowed else self.assert_denied)(response)

    def test_digital_id_exact_role_matrix(self):
        self._login('superuser')
        self._post(f'/api/residents/{self.resident.id}/qr/issue/')
        expected = {
            'secretary': {'view', 'verify', 'issue', 'print'},
            'captain': {'view', 'verify', 'reissue', 'revoke', 'print'},
            'bhw': {'verify'},
            'ordinary': set(),
            'anonymous': set(),
            'superuser': {'view', 'verify', 'issue', 'reissue', 'revoke', 'print'},
        }

        for actor, allowed in expected.items():
            with self.subTest(actor=actor, action='view'):
                self._login(actor)
                response = self.client.get(f'/api/residents/{self.resident.id}/detail/')
                if 'view' in allowed:
                    self.assert_allowed(response)
                    self.assertIn('qr', response.json()['permissions']['visible_tabs'])
                else:
                    self.assert_denied(response)

            with self.subTest(actor=actor, action='verify'):
                self._login(actor)
                response = self._post('/api/qr/resolve/', {'qr_input': self.resident.qr_code})
                (self.assert_allowed if 'verify' in allowed else self.assert_denied)(response)

            with self.subTest(actor=actor, action='issue'):
                isolated = Resident.objects.create(
                    first_name='Issue', last_name=f'{actor} Resident', date_of_birth='1991-01-01'
                )
                self._login(actor)
                response = self._post(f'/api/residents/{isolated.id}/qr/issue/')
                (self.assert_allowed if 'issue' in allowed else self.assert_denied)(response)

            for action_name in ('reissue', 'revoke'):
                with self.subTest(actor=actor, action=action_name):
                    isolated = Resident.objects.create(
                        first_name=action_name.title(), last_name=f'{actor} Resident',
                        date_of_birth='1992-01-01',
                    )
                    self._login('superuser')
                    self._post(f'/api/residents/{isolated.id}/qr/issue/')
                    self._login(actor)
                    response = self._post(
                        f'/api/residents/{isolated.id}/qr/{action_name}/',
                        {'reason': 'Capability matrix test'},
                    )
                    (self.assert_allowed if action_name in allowed else self.assert_denied)(response)

            with self.subTest(actor=actor, action='print'):
                self._login(actor)
                response = self.client.get(
                    f'/residents/documents/barangay-id/sample/{self.resident.id}/'
                )
                (self.assert_allowed if 'print' in allowed else self.assert_denied)(response)

    def test_intentional_public_endpoints_remain_public(self):
        document = self._document()
        self._login('superuser')
        identifier = self._post(
            f'/api/residents/{self.resident.id}/qr/issue/'
        ).json()['identifier']
        self._login('anonymous')

        self.assertEqual(
            self.client.get('/api/document-requests/track/', {
                'tracking_number': document.tracking_number,
            }).status_code,
            200,
        )
        self.assertEqual(self.client.get(f'/api/qr/verify/{identifier}/').status_code, 200)
        public_create = self.client.post('/residents/request-document/', {
            'full_name': 'Public Resident',
            'contact_number': '09170000000',
            'email': '',
            'address': 'Purok Talisay',
            'document_type': 'barangay_clearance',
            'purpose': 'Public request test',
            'preferred_release_date': '',
        })
        self.assertEqual(public_create.status_code, 302)
