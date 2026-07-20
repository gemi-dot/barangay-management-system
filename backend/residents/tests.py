import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from .models import DocumentRequest, Resident


class ResidentSecurityRegressionTests(TestCase):
	def setUp(self):
		self.user_model = get_user_model()
		self.secretary_group, _ = Group.objects.get_or_create(name='Secretary')
		self.staff_user = self.user_model.objects.create_user(
			username='staff-user',
			password='testpass123',
			is_staff=True,
		)
		self.staff_user.groups.add(self.secretary_group)
		self.regular_user = self.user_model.objects.create_user(
			username='regular-user',
			password='testpass123',
			first_name='Nina',
			last_name='Dela Cruz',
			email='nina@example.com',
		)
		self.other_user = self.user_model.objects.create_user(
			username='other-user',
			password='testpass123',
			first_name='Nina',
			last_name='Dela Cruz',
			email='other@example.com',
		)

		self.linked_resident = Resident.objects.create(
			first_name='Nina',
			middle_name='A',
			last_name='Dela Cruz',
			gender='F',
			zone='Purok Kulo',
			portal_user=self.regular_user,
			email='nina@example.com',
		)
		self.unlinked_name_match_resident = Resident.objects.create(
			first_name='Nina',
			middle_name='B',
			last_name='Dela Cruz',
			gender='F',
			zone='Purok Tugas',
			email='shared-name@example.com',
		)

	def test_resident_portal_login_blocks_external_next_redirect(self):
		response = self.client.post(
			f"{reverse('resident_portal:login')}?next=https://evil.example/landing",
			{
				'username': self.regular_user.username,
				'password': 'testpass123',
			},
		)

		self.assertEqual(response.status_code, 302)
		self.assertEqual(response.url, reverse('resident_portal:dashboard'))

	def test_non_staff_cannot_access_document_requests_queue(self):
		self.client.force_login(self.regular_user)
		response = self.client.get(reverse('residents:document_requests_queue'))
		self.assertEqual(response.status_code, 403)

	def test_staff_can_access_document_requests_queue(self):
		self.client.force_login(self.staff_user)
		response = self.client.get(reverse('residents:document_requests_queue'))
		self.assertEqual(response.status_code, 200)

	def test_group_role_can_access_queue_even_without_staff_flag(self):
		bhw_group, _ = Group.objects.get_or_create(name='BHW')
		bhw_user = self.user_model.objects.create_user(
			username='bhw-user',
			password='testpass123',
			is_staff=False,
		)
		bhw_user.groups.add(bhw_group)

		self.client.force_login(bhw_user)
		response = self.client.get(reverse('residents:document_requests_queue'))
		self.assertEqual(response.status_code, 200)

	def test_staff_without_role_cannot_access_queue(self):
		ungrouped_staff = self.user_model.objects.create_user(
			username='ungrouped-staff',
			password='testpass123',
			is_staff=True,
		)

		self.client.force_login(ungrouped_staff)
		response = self.client.get(reverse('residents:document_requests_queue'))
		self.assertEqual(response.status_code, 403)

	def test_resident_api_list_requires_staff(self):
		anon = self.client.get('/api/residents/')
		self.assertIn(anon.status_code, {401, 403})

		self.client.force_login(self.regular_user)
		non_staff = self.client.get('/api/residents/')
		self.assertEqual(non_staff.status_code, 403)

		self.client.force_login(self.staff_user)
		staff = self.client.get('/api/residents/')
		self.assertEqual(staff.status_code, 200)

	def test_portal_api_requests_are_scoped_to_submitted_by(self):
		own = DocumentRequest.objects.create(
			full_name='Nina Dela Cruz',
			contact_number='09171234567',
			email='nina@example.com',
			submitted_by=self.regular_user,
			address='Purok Kulo',
			document_type='certificate_of_residency',
			purpose='Employment',
		)
		DocumentRequest.objects.create(
			full_name='Nina Dela Cruz',
			contact_number='09170000000',
			email='nina@example.com',
			submitted_by=self.other_user,
			address='Purok Kulo',
			document_type='certificate_of_indigency',
			purpose='Aid',
		)

		self.client.force_login(self.regular_user)
		response = self.client.get('/api/portal/requests/')

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(len(payload['results']), 1)
		self.assertEqual(payload['results'][0]['tracking_number'], own.tracking_number)

	def test_portal_request_create_sets_submitted_by(self):
		self.client.force_login(self.regular_user)
		response = self.client.post(
			'/api/portal/requests/create/',
			data=json.dumps(
				{
					'full_name': 'Nina Dela Cruz',
					'contact_number': '09171234567',
					'email': 'nina@example.com',
					'address': 'Purok Kulo',
					'document_type': 'certificate_of_residency',
					'purpose': 'School requirement',
				}
			),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 201)
		tracking_number = response.json()['tracking_number']
		created = DocumentRequest.objects.get(tracking_number=tracking_number)
		self.assertEqual(created.submitted_by_id, self.regular_user.id)

	def test_portal_dashboard_links_only_explicit_portal_user(self):
		self.client.force_login(self.regular_user)
		response = self.client.get('/api/portal/dashboard/')

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertIsNotNone(payload['resident'])
		self.assertEqual(payload['resident']['id'], self.linked_resident.id)
		self.assertNotEqual(payload['resident']['id'], self.unlinked_name_match_resident.id)
