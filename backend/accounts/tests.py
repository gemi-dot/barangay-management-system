from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


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
