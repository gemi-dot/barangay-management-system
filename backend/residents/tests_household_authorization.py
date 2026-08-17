import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from .household_services import add_household_member, create_household
from .models import Household, HouseholdMembership, Resident


class HouseholdAuthorizationTests(TestCase):
    password = 'testpass123'

    def setUp(self):
        self.User = get_user_model()
        self.users = {
            'ordinary': self._user('ordinary'),
            'staff': self._user('staff', is_staff=True),
            'secretary': self._user('secretary', role='Secretary'),
            'bhw': self._user('bhw', role='BHW'),
            'captain': self._user('captain', role='Captain'),
            'superuser': self.User.objects.create_superuser(
                username='superuser', password=self.password, email='root@example.com'
            ),
        }
        self.head = self._resident('Head', 'Resident')
        self.member = self._resident('Member', 'Resident')
        self.other = self._resident('Other', 'Resident')
        self.household = create_household(
            household_head=self.head,
            complete_address='1 Test Street',
            purok='Purok Talisay',
        )
        add_household_member(
            household=self.household,
            resident=self.member,
            relationship_to_head=HouseholdMembership.Relationship.CHILD,
        )

    def _user(self, username, *, role=None, is_staff=False):
        user = self.User.objects.create_user(
            username=username, password=self.password, is_staff=is_staff
        )
        if role:
            user.groups.add(Group.objects.get_or_create(name=role)[0])
        return user

    def _resident(self, first_name, last_name):
        return Resident.objects.create(
            first_name=first_name,
            last_name=last_name,
            gender='M',
            date_of_birth='1990-01-01',
            zone='Purok Talisay',
        )

    def _login_as(self, identity):
        self.client.logout()
        if identity != 'anonymous':
            self.client.force_login(self.users[identity])

    def _request(self, method, path, payload=None):
        return getattr(self.client, method)(
            path,
            data=json.dumps(payload or {}),
            content_type='application/json',
        )

    def assert_access_matrix(self, request, *, allowed, allowed_statuses):
        identities = ('anonymous', 'ordinary', 'staff', 'secretary', 'bhw', 'captain', 'superuser')
        for identity in identities:
            with self.subTest(identity=identity):
                self._login_as(identity)
                response = request()
                if identity in allowed:
                    self.assertIn(response.status_code, allowed_statuses)
                else:
                    self.assertIn(response.status_code, {401, 403})

    def test_household_view_endpoints_require_household_view(self):
        allowed = {'secretary', 'bhw', 'captain', 'superuser'}
        for path in (
            '/api/households/list/',
            '/api/households/summary/',
            f'/api/households/{self.household.id}/',
            f'/api/households/{self.household.id}/statistics/',
        ):
            with self.subTest(path=path):
                self.assert_access_matrix(
                    lambda path=path: self.client.get(path),
                    allowed=allowed,
                    allowed_statuses={200},
                )

    def test_create_requires_household_manage(self):
        self.assert_access_matrix(
            lambda: self._request('post', '/api/households/', {}),
            allowed={'secretary', 'superuser'},
            allowed_statuses={400},
        )

    def test_edit_and_archive_require_household_manage(self):
        for method, path, payload in (
            ('patch', '/api/households/999999999/', {'notes': 'No target'}),
            ('post', '/api/households/999999999/archive/', {'status': 'archived'}),
        ):
            with self.subTest(path=path):
                self.assert_access_matrix(
                    lambda method=method, path=path, payload=payload: self._request(
                        method, path, payload
                    ),
                    allowed={'secretary', 'superuser'},
                    allowed_statuses={404},
                )

    def test_membership_mutations_require_household_manage(self):
        for method, path, payload in (
            ('post', '/api/households/999999999/members/', {'resident_id': self.other.id}),
            ('delete', f'/api/households/999999999/members/{self.other.id}/', None),
        ):
            with self.subTest(path=path):
                self.assert_access_matrix(
                    lambda method=method, path=path, payload=payload: self._request(
                        method, path, payload
                    ),
                    allowed={'secretary', 'superuser'},
                    allowed_statuses={404},
                )

    def test_change_head_requires_dedicated_capability(self):
        self.assert_access_matrix(
            lambda: self._request(
                'post',
                '/api/households/999999999/change-head/',
                {'resident_id': self.member.id, 'previous_head_relationship': 'parent'},
            ),
            allowed={'secretary', 'captain', 'superuser'},
            allowed_statuses={404},
        )

    def test_secretary_and_superuser_can_reactivate_eligible_household(self):
        for identity, household_status in (
            ('secretary', Household.Status.INACTIVE),
            ('secretary', Household.Status.ARCHIVED),
            ('secretary', Household.Status.TRANSFERRED),
            ('superuser', Household.Status.ARCHIVED),
        ):
            with self.subTest(identity=identity, household_status=household_status):
                self.household.status = household_status
                self.household.save(update_fields=['status', 'updated_at'])
                self._login_as(identity)

                response = self._request(
                    'post', f'/api/households/{self.household.id}/reactivate/'
                )

                self.assertEqual(response.status_code, 200)
                self.household.refresh_from_db()
                self.assertEqual(self.household.status, Household.Status.ACTIVE)

    def test_reactivate_denies_users_without_household_manage_without_changing_state(self):
        for identity in ('anonymous', 'ordinary', 'staff', 'bhw', 'captain'):
            with self.subTest(identity=identity):
                self.household.status = Household.Status.ARCHIVED
                self.household.save(update_fields=['status', 'updated_at'])
                self._login_as(identity)

                response = self._request(
                    'post', f'/api/households/{self.household.id}/reactivate/'
                )

                self.assertIn(response.status_code, {401, 403})
                self.household.refresh_from_db()
                self.assertEqual(self.household.status, Household.Status.ARCHIVED)

    def test_active_household_cannot_be_reactivated(self):
        self._login_as('secretary')

        response = self._request(
            'post', f'/api/households/{self.household.id}/reactivate/'
        )

        self.assertEqual(response.status_code, 400)
        self.household.refresh_from_db()
        self.assertEqual(self.household.status, Household.Status.ACTIVE)

    def test_generic_edit_cannot_change_head_or_status(self):
        self._login_as('secretary')
        original_head_id = self.household.household_head_id
        original_status = self.household.status

        head_response = self._request(
            'patch',
            f'/api/households/{self.household.id}/',
            {'household_head_id': self.member.id},
        )
        status_response = self._request(
            'patch',
            f'/api/households/{self.household.id}/',
            {'status': Household.Status.ARCHIVED},
        )
        put_status_response = self._request(
            'put',
            f'/api/households/{self.household.id}/',
            {'status': Household.Status.ARCHIVED},
        )

        self.assertEqual(head_response.status_code, 400)
        self.assertEqual(status_response.status_code, 400)
        self.assertEqual(put_status_response.status_code, 400)
        self.household.refresh_from_db()
        self.assertEqual(self.household.household_head_id, original_head_id)
        self.assertEqual(self.household.status, original_status)

    def test_family_reads_require_family_view(self):
        for path in (
            f'/api/residents/{self.head.id}/family-relationships/',
            f'/api/residents/{self.head.id}/family-tree/',
        ):
            with self.subTest(path=path):
                self.assert_access_matrix(
                    lambda path=path: self.client.get(path),
                    allowed={'secretary', 'bhw', 'captain', 'superuser'},
                    allowed_statuses={200},
                )

    def test_family_mutations_require_family_manage(self):
        self.assert_access_matrix(
            lambda: self._request(
                'post',
                f'/api/residents/{self.head.id}/family-relationships/',
                {'to_resident_id': 999999999, 'relationship_type': 'parent'},
            ),
            allowed={'secretary', 'superuser'},
            allowed_statuses={400},
        )
        self.assert_access_matrix(
            lambda: self._request(
                'delete',
                f'/api/residents/{self.head.id}/family-relationships/999999999/',
            ),
            allowed={'secretary', 'superuser'},
            allowed_statuses={404},
        )
