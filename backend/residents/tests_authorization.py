import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from .models import Resident


class ResidentActionAuthorizationTests(TestCase):
    password = 'testpass123'

    def setUp(self):
        self.resident = Resident.objects.create(
            first_name='Authorization',
            last_name='Resident',
            date_of_birth='1990-01-01',
        )
        self.users = {
            'ordinary': self._user('ordinary'),
            'staff': self._user('staff', is_staff=True),
            'secretary': self._role_user('secretary', 'Secretary'),
            'bhw': self._role_user('bhw', 'BHW'),
            'captain': self._role_user('captain', 'Captain'),
            'superuser': get_user_model().objects.create_superuser(
                username='superuser', password=self.password, email='root@example.com'
            ),
        }

    def _user(self, username, **kwargs):
        return get_user_model().objects.create_user(
            username=username, password=self.password, **kwargs
        )

    def _role_user(self, username, role):
        user = self._user(username)
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)
        return user

    def request_as(self, actor, method, path, payload=None):
        self.client.logout()
        if actor != 'anonymous':
            self.client.force_login(self.users[actor])
        request_method = getattr(self.client, method)
        if payload is None:
            return request_method(path)
        return request_method(path, data=json.dumps(payload), content_type='application/json')

    def assert_matrix(self, method, path, allowed, payload=None):
        actors = {'anonymous', *self.users}
        for actor in actors:
            with self.subTest(actor=actor, method=method, path=path):
                response = self.request_as(actor, method, path, payload)
                if actor in allowed:
                    self.assertLess(response.status_code, 400, response.content)
                else:
                    self.assertIn(response.status_code, {401, 403}, response.content)

    def test_basic_list_access_matrix(self):
        self.assert_matrix('get', '/api/residents/', {'secretary', 'bhw', 'captain', 'superuser'})

    def test_sensitive_detail_access_matrix(self):
        self.assert_matrix(
            'get', f'/api/residents/{self.resident.id}/', {'secretary', 'captain', 'superuser'}
        )
        self.assert_matrix(
            'get', f'/api/residents/{self.resident.id}/detail/', {'secretary', 'captain', 'superuser'}
        )

    def test_create_access_matrix(self):
        self.assert_matrix('post', '/api/residents/', {'secretary', 'superuser'}, {
            'first_name': 'Created',
            'last_name': 'Resident',
            'date_of_birth': '1995-05-05',
        })

    def test_ordinary_edit_access_matrix(self):
        self.assert_matrix(
            'patch', f'/api/residents/{self.resident.id}/', {'secretary', 'superuser'},
            {'contact_number': '+639123456789'},
        )

    def test_bulk_correction_read_and_write_matrices(self):
        for path in ('/api/quick-tools/gender-correction/', '/api/quick-tools/birthday-correction/'):
            self.assert_matrix('get', path, {'secretary', 'bhw', 'captain', 'superuser'})
            self.assert_matrix('post', path, {'secretary', 'superuser'}, {'zone': 'ALL', 'updates': []})

    def test_service_log_mutation_access_matrix(self):
        self.assert_matrix(
            'post', f'/api/residents/{self.resident.id}/service-log/',
            {'secretary', 'superuser'}, {'action': 'visited_today'},
        )

    def test_archive_access_matrix(self):
        self.assert_matrix(
            'post', f'/api/residents/{self.resident.id}/archive/',
            {'secretary', 'captain', 'superuser'}, {},
        )

    def test_transfer_access_matrix(self):
        self.assert_matrix(
            'post', f'/api/residents/{self.resident.id}/transfer/',
            {'secretary', 'captain', 'superuser'}, {},
        )

    def test_restore_access_matrix(self):
        self.resident.residency_status = Resident.ResidencyStatus.ARCHIVED
        self.resident.is_active = False
        self.resident.save(update_fields=['residency_status', 'is_active'])
        self.assert_matrix(
            'post', f'/api/residents/{self.resident.id}/restore/', {'captain', 'superuser'}, {}
        )

    def test_mark_deceased_access_matrix(self):
        self.assert_matrix(
            'post', f'/api/residents/{self.resident.id}/mark-deceased/',
            {'captain', 'superuser'}, {},
        )

    def test_permanent_delete_access_matrix(self):
        for actor in {'anonymous', 'ordinary', 'staff', 'secretary', 'bhw', 'captain'}:
            response = self.request_as(actor, 'delete', f'/api/residents/{self.resident.id}/')
            self.assertIn(response.status_code, {401, 403})
            self.assertTrue(Resident.objects.filter(pk=self.resident.pk).exists())

        response = self.request_as('superuser', 'delete', f'/api/residents/{self.resident.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Resident.objects.filter(pk=self.resident.pk).exists())

    def test_generic_edit_cannot_bypass_lifecycle_or_identity_management(self):
        protected_payload = {
            'is_active': False,
            'residency_status': Resident.ResidencyStatus.DECEASED,
            'qr_code': 'BYPASSATTEMPT01',
        }
        for actor in {'secretary', 'superuser'}:
            with self.subTest(actor=actor):
                response = self.request_as(
                    actor, 'patch', f'/api/residents/{self.resident.id}/', protected_payload
                )
                self.assertEqual(response.status_code, 400, response.content)
                self.resident.refresh_from_db()
                self.assertTrue(self.resident.is_active)
                self.assertEqual(self.resident.residency_status, Resident.ResidencyStatus.ACTIVE)
                self.assertNotEqual(self.resident.qr_code, 'BYPASSATTEMPT01')
