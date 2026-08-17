from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from .capabilities import (
	ALL_CAPABILITIES,
	DIGITAL_ID_ISSUE,
	DIGITAL_ID_REVOKE,
	HEALTH_MANAGE,
	INVENTORY_MANAGE,
	RESIDENT_CREATE,
	SETTINGS_MANAGE,
	capabilities_for_user,
	user_has_capability,
)


class LoginSafetyTests(TestCase):
	def setUp(self):
		self.password = 'testpass123'
		self.user = get_user_model().objects.create_user(
			username='safe-login-user',
			password=self.password,
		)

	def test_login_blocks_external_next_redirect(self):
		response = self.client.post(
			f"{reverse('login')}?next=https://evil.example/phish",
			{
				'username': self.user.username,
				'password': self.password,
			},
		)

		self.assertEqual(response.status_code, 302)
		self.assertEqual(response.url, '/')

	def test_login_allows_local_next_redirect(self):
		response = self.client.post(
			f"{reverse('login')}?next=/dashboard/residents/",
			{
				'username': self.user.username,
				'password': self.password,
			},
		)

		self.assertEqual(response.status_code, 302)
		self.assertEqual(response.url, '/dashboard/residents/')


class CanonicalAuthorizationTests(TestCase):
	def setUp(self):
		self.User = get_user_model()
		self.password = 'testpass123'

	def session_payload(self, user=None):
		if user is not None:
			self.client.force_login(user)
		return self.client.get(reverse('session')).json()

	def user_for_role(self, role_name):
		user = self.User.objects.create_user(
			username=f'{role_name.lower()}-user',
			password=self.password,
		)
		user.groups.add(Group.objects.create(name=role_name))
		return user

	def test_anonymous_user_has_no_roles_or_capabilities(self):
		payload = self.session_payload()
		self.assertFalse(payload['is_authenticated'])
		self.assertEqual(payload['roles'], [])
		self.assertEqual(payload['capabilities'], [])

	def test_authenticated_user_without_office_role_is_default_denied(self):
		user = self.User.objects.create_user(username='ordinary-user', password=self.password)
		payload = self.session_payload(user)
		self.assertFalse(payload['has_office_role'])
		self.assertEqual(payload['roles'], [])
		self.assertEqual(payload['capabilities'], [])

	def test_plain_staff_user_has_no_operational_capabilities(self):
		user = self.User.objects.create_user(
			username='plain-staff', password=self.password, is_staff=True
		)
		payload = self.session_payload(user)
		self.assertTrue(payload['is_staff'])
		self.assertFalse(payload['has_office_role'])
		self.assertEqual(payload['capabilities'], [])

	def test_secretary_bundle(self):
		user = self.user_for_role('Secretary')
		self.assertTrue(user_has_capability(user, RESIDENT_CREATE))
		self.assertTrue(user_has_capability(user, DIGITAL_ID_ISSUE))
		self.assertTrue(user_has_capability(user, INVENTORY_MANAGE))
		self.assertFalse(user_has_capability(user, HEALTH_MANAGE))
		self.assertFalse(user_has_capability(user, DIGITAL_ID_REVOKE))

	def test_bhw_bundle(self):
		user = self.user_for_role('BHW')
		self.assertTrue(user_has_capability(user, HEALTH_MANAGE))
		self.assertFalse(user_has_capability(user, RESIDENT_CREATE))
		self.assertFalse(user_has_capability(user, DIGITAL_ID_ISSUE))
		self.assertFalse(user_has_capability(user, INVENTORY_MANAGE))

	def test_captain_bundle(self):
		user = self.user_for_role('Captain')
		self.assertTrue(user_has_capability(user, DIGITAL_ID_REVOKE))
		self.assertTrue(user_has_capability(user, SETTINGS_MANAGE))
		self.assertFalse(user_has_capability(user, RESIDENT_CREATE))
		self.assertFalse(user_has_capability(user, INVENTORY_MANAGE))

	def test_superuser_has_every_registered_capability(self):
		user = self.User.objects.create_superuser(
			username='root-user', password=self.password, email='root@example.com'
		)
		payload = self.session_payload(user)
		self.assertTrue(payload['is_superuser'])
		self.assertIn('Superuser', payload['roles'])
		self.assertEqual(set(payload['capabilities']), set(ALL_CAPABILITIES))
		self.assertEqual(capabilities_for_user(user), ALL_CAPABILITIES)

	def test_login_response_exposes_roles_and_capabilities(self):
		user = self.user_for_role('Secretary')
		response = self.client.post(reverse('api_login'), {
			'username': user.username,
			'password': self.password,
		})
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['roles'], ['Secretary'])
		self.assertIn(RESIDENT_CREATE, payload['capabilities'])
