import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from .family_services import create_reciprocal_relationship
from .household_services import change_household_head, create_household
from .models import (
	DocumentRequest,
	FamilyRelationship,
	Household,
	HouseholdMembership,
	Resident,
	ResidentServiceLog,
)


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

	def test_bhw_group_cannot_access_document_queue(self):
		bhw_group, _ = Group.objects.get_or_create(name='BHW')
		bhw_user = self.user_model.objects.create_user(
			username='bhw-user',
			password='testpass123',
			is_staff=False,
		)
		bhw_user.groups.add(bhw_group)

		self.client.force_login(bhw_user)
		response = self.client.get(reverse('residents:document_requests_queue'))
		self.assertEqual(response.status_code, 403)

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

	def test_resident_profile_tabs_payload_uses_existing_related_data(self):
		self.linked_resident.father_name = 'Ramon Dela Cruz'
		self.linked_resident.mother_name = 'Elena Dela Cruz'
		self.linked_resident.spouse_name = 'Marco Dela Cruz'
		self.linked_resident.save(update_fields=['father_name', 'mother_name', 'spouse_name'])
		household = create_household(
			household_head=self.linked_resident,
			household_number='PROFILE-HH-001',
			purok='Purok Kulo',
			complete_address='Purok Kulo, Abgao',
		)
		document = DocumentRequest.objects.create(
			full_name=self.linked_resident.full_name,
			contact_number='09171234567',
			email=self.linked_resident.email,
			submitted_by=self.regular_user,
			address='Purok Kulo, Abgao',
			document_type='certificate_of_residency',
			purpose='Resident profile test',
		)
		log = ResidentServiceLog.objects.create(
			resident=self.linked_resident,
			logged_by=self.staff_user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Profile history test.',
		)

		anonymous = self.client.get(f'/api/residents/{self.linked_resident.id}/detail/')
		self.assertIn(anonymous.status_code, {401, 403})
		self.client.force_login(self.staff_user)
		response = self.client.get(f'/api/residents/{self.linked_resident.id}/detail/')
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['household']['id'], household.id)
		self.assertEqual(payload['household']['relationship_to_head'], 'head')
		self.assertEqual(payload['family']['father_name'], 'Ramon Dela Cruz')
		self.assertEqual(payload['documents'][0]['tracking_number'], document.tracking_number)
		self.assertEqual(payload['history'][0]['id'], log.id)
		self.assertEqual(payload['qr_profile']['code'], self.linked_resident.qr_code)
		self.assertEqual(payload['summary']['household_number'], 'PROFILE-HH-001')
		self.assertTrue(payload['permissions']['actions']['manage_family'])
		self.assertIn('personal', payload['permissions']['visible_tabs'])
		self.assertEqual(payload['household']['head_resident_id'], self.linked_resident.id)
		self.assertEqual(payload['household']['members'][0]['resident_id'], self.linked_resident.id)
		self.assertEqual(payload['household_history'][0]['household_number'], 'PROFILE-HH-001')

	def test_resident_profile_summary_reports_incomplete_data_without_new_schema(self):
		self.linked_resident.contact_number = ''
		self.linked_resident.house_number = None
		self.linked_resident.save(update_fields=['contact_number', 'house_number'])
		self.client.force_login(self.staff_user)

		response = self.client.get(f'/api/residents/{self.linked_resident.id}/detail/')

		self.assertEqual(response.status_code, 200)
		codes = {alert['code'] for alert in response.json()['alerts']}
		self.assertIn('missing_household', codes)
		self.assertIn('missing_contact', codes)
		self.assertIn('incomplete_address', codes)

	def test_resident_profile_detail_query_count_is_bounded(self):
		self.client.force_login(self.staff_user)
		with CaptureQueriesContext(connection) as queries:
			response = self.client.get(f'/api/residents/{self.linked_resident.id}/detail/')

		self.assertEqual(response.status_code, 200)
		self.assertLessEqual(len(queries), 12)

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

		requests_response = self.client.get('/api/portal/requests/')
		self.assertEqual(requests_response.status_code, 200)
		self.assertIn(
			tracking_number,
			[item['tracking_number'] for item in requests_response.json()['results']],
		)

		dashboard_response = self.client.get('/api/portal/dashboard/')
		self.assertEqual(dashboard_response.status_code, 200)
		self.assertEqual(dashboard_response.json()['counts']['total_requests'], 1)
		self.assertEqual(dashboard_response.json()['counts']['pending_requests'], 1)

	def test_portal_request_create_without_trailing_slash_returns_json(self):
		self.client.force_login(self.regular_user)
		response = self.client.post(
			'/api/portal/requests/create',
			data=json.dumps(
				{
					'full_name': 'Nina Dela Cruz',
					'contact_number': '09171234567',
					'email': 'nina@example.com',
					'address': 'Purok Kulo',
					'document_type': 'certificate_of_residency',
					'purpose': 'Employment requirement',
				}
			),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response['Content-Type'], 'application/json')

	def test_portal_request_invalid_payload_returns_json_400(self):
		self.client.force_login(self.regular_user)
		response = self.client.post(
			'/api/portal/requests/create/',
			data=json.dumps({'document_type': 'not-a-document-type'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response['Content-Type'], 'application/json')
		self.assertIn('errors', response.json())

	def test_portal_request_unauthorized_returns_json_401(self):
		response = self.client.post(
			'/api/portal/requests/create/',
			data=json.dumps({}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 401)
		self.assertEqual(response['Content-Type'], 'application/json')
		self.assertIn('detail', response.json())

	def test_portal_dashboard_links_only_explicit_portal_user(self):
		self.client.force_login(self.regular_user)
		response = self.client.get('/api/portal/dashboard/')

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertIsNotNone(payload['resident'])
		self.assertEqual(payload['resident']['id'], self.linked_resident.id)
		self.assertNotEqual(payload['resident']['id'], self.unlinked_name_match_resident.id)


class DocumentRequestApiRegressionTests(TestCase):
	def setUp(self):
		secretary_group, _ = Group.objects.get_or_create(name='Secretary')
		self.staff_user = get_user_model().objects.create_user(
			username='document-request-staff',
			password='testpass123',
			is_staff=True,
		)
		self.staff_user.groups.add(secretary_group)

	def make_request(self, **overrides):
		defaults = {
			'full_name': 'Unlinked Resident',
			'contact_number': '09171234567',
			'email': '',
			'address': 'Purok Talisay',
			'document_type': 'barangay_clearance',
			'purpose': 'Employment requirement',
		}
		defaults.update(overrides)
		return DocumentRequest.objects.create(**defaults)

	def test_document_request_list_uses_correct_slash_and_no_slash_paths(self):
		self.assertEqual(reverse('document-request-list-no-slash'), '/api/document-requests')
		self.assertEqual(reverse('document-requests-list'), '/api/document-requests/')
		self.client.force_login(self.staff_user)

		for path in ('/api/document-requests', '/api/document-requests/'):
			with self.subTest(path=path):
				response = self.client.get(path, {'page': 1, 'page_size': 20})
				self.assertEqual(response.status_code, 200)
				self.assertEqual(response['Content-Type'], 'application/json')

	def test_document_request_list_returns_empty_paginated_result(self):
		self.client.force_login(self.staff_user)

		response = self.client.get('/api/document-requests', {'page': 1, 'page_size': 20})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()['count'], 0)
		self.assertEqual(response.json()['results'], [])

	def test_document_request_list_requires_authorized_staff(self):
		anonymous = self.client.get('/api/document-requests')
		self.assertIn(anonymous.status_code, {401, 403})

		regular_user = get_user_model().objects.create_user(
			username='document-request-regular', password='testpass123'
		)
		self.client.force_login(regular_user)
		unauthorized = self.client.get('/api/document-requests')
		self.assertEqual(unauthorized.status_code, 403)

	def test_document_request_list_handles_missing_user_and_resident_links(self):
		document_request = self.make_request(submitted_by=None, processed_by=None)
		self.client.force_login(self.staff_user)

		response = self.client.get('/api/document-requests')

		self.assertEqual(response.status_code, 200)
		result = response.json()['results'][0]
		self.assertEqual(result['id'], document_request.id)
		self.assertEqual(result['full_name'], 'Unlinked Resident')
		self.assertEqual(result['processed_by'], '')

	def test_status_update_and_public_tracking_still_work(self):
		document_request = self.make_request()
		self.client.force_login(self.staff_user)
		updated = self.client.post(
			f'/api/document-requests/{document_request.id}/status/',
			data=json.dumps({'status': 'processing', 'remarks': 'Validated'}),
			content_type='application/json',
		)
		self.assertEqual(updated.status_code, 200)
		self.assertEqual(updated.json()['status'], 'processing')
		self.assertEqual(updated.json()['processed_by'], self.staff_user.get_full_name())

		self.client.logout()
		tracked = self.client.get(
			'/api/document-requests/track/',
			{'tracking_number': document_request.tracking_number},
		)
		self.assertEqual(tracked.status_code, 200)
		self.assertEqual(tracked.json()['tracking_number'], document_request.tracking_number)
		self.assertEqual(tracked.json()['status'], 'processing')


class FamilyRelationshipEngineTests(TestCase):
	def setUp(self):
		group, _ = Group.objects.get_or_create(name='Secretary')
		self.user = get_user_model().objects.create_user(
			username='family-staff', password='testpass123', is_staff=True
		)
		self.user.groups.add(group)
		self.resident = self.make_resident('Alex', 'Santos', '1990-01-01')
		self.parent = self.make_resident('Rosa', 'Santos', '1965-01-01', gender='F')
		self.child = self.make_resident('Mika', 'Santos', '2015-01-01', gender='F')
		self.other = self.make_resident('Nico', 'Reyes', '1992-01-01')
		self.client.force_login(self.user)

	def make_resident(self, first_name, last_name, date_of_birth, gender='M', **extra):
		return Resident.objects.create(
			first_name=first_name,
			last_name=last_name,
			date_of_birth=date_of_birth,
			gender=gender,
			**extra,
		)

	def post_relationship(self, resident, target, relationship_type):
		return self.client.post(
			f'/api/residents/{resident.id}/family-relationships/',
			data=json.dumps({
				'to_resident_id': target.id,
				'relationship_type': relationship_type,
			}),
			content_type='application/json',
		)

	def test_parent_child_relationship_is_created_reciprocally(self):
		response = self.post_relationship(self.parent, self.child, 'parent')
		self.assertEqual(response.status_code, 201)
		forward = FamilyRelationship.objects.get(from_resident=self.parent, to_resident=self.child)
		reverse = FamilyRelationship.objects.get(from_resident=self.child, to_resident=self.parent)
		self.assertEqual(forward.relationship_type, 'parent')
		self.assertEqual(reverse.relationship_type, 'child')
		self.assertEqual(forward.pair_id, reverse.pair_id)

	def test_symmetric_and_guardian_relationships_are_reciprocal(self):
		spouse = self.post_relationship(self.resident, self.other, 'spouse')
		self.assertEqual(spouse.status_code, 201)
		self.assertEqual(
			FamilyRelationship.objects.get(from_resident=self.other, to_resident=self.resident).relationship_type,
			'spouse',
		)
		guardian = self.post_relationship(self.parent, self.child, 'guardian')
		self.assertEqual(guardian.status_code, 201)
		self.assertEqual(
			FamilyRelationship.objects.get(from_resident=self.child, to_resident=self.parent).relationship_type,
			'ward',
		)

	def test_self_duplicate_conflicting_and_inactive_relationships_are_rejected(self):
		self.assertEqual(self.post_relationship(self.resident, self.resident, 'sibling').status_code, 400)
		self.assertEqual(self.post_relationship(self.resident, self.other, 'sibling').status_code, 201)
		self.assertEqual(self.post_relationship(self.resident, self.other, 'sibling').status_code, 400)
		self.assertEqual(self.post_relationship(self.resident, self.other, 'guardian').status_code, 400)
		self.child.is_active = False
		self.child.save(update_fields=['is_active'])
		self.assertEqual(self.post_relationship(self.parent, self.child, 'parent').status_code, 400)

	def test_parent_child_cycle_is_rejected(self):
		self.assertEqual(self.post_relationship(self.parent, self.resident, 'parent').status_code, 201)
		self.assertEqual(self.post_relationship(self.resident, self.child, 'parent').status_code, 201)
		cycle = self.post_relationship(self.child, self.parent, 'parent')
		self.assertEqual(cycle.status_code, 400)
		self.assertIn('cycle', str(cycle.json()).lower())

	def test_deleting_relationship_deactivates_both_reciprocal_rows(self):
		created = self.post_relationship(self.resident, self.other, 'sibling')
		relationship_id = created.json()['id']
		response = self.client.delete(
			f'/api/residents/{self.resident.id}/family-relationships/{relationship_id}/'
		)
		self.assertEqual(response.status_code, 204)
		self.assertEqual(
			FamilyRelationship.objects.filter(status=FamilyRelationship.Status.INACTIVE).count(), 2
		)

	def test_tree_api_groups_relationships_around_resident(self):
		create_reciprocal_relationship(
			from_resident=self.parent, to_resident=self.resident,
			relationship_type='parent', created_by=self.user,
		)
		create_reciprocal_relationship(
			from_resident=self.resident, to_resident=self.child,
			relationship_type='parent', created_by=self.user,
		)
		response = self.client.get(f'/api/residents/{self.resident.id}/family-tree/')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()['parents'][0]['resident_id'], self.parent.id)
		self.assertEqual(response.json()['children'][0]['resident_id'], self.child.id)

	def test_relationship_apis_require_staff_and_public_qr_does_not_expose_family(self):
		self.client.logout()
		family_response = self.client.get(f'/api/residents/{self.resident.id}/family-tree/')
		self.assertIn(family_response.status_code, {401, 403})
		qr_response = self.client.post(
			'/api/qr/resolve/',
			data=json.dumps({'qr_input': self.resident.qr_code}),
			content_type='application/json',
		)
		self.assertIn(qr_response.status_code, {401, 403})
		self.assertNotIn('family', qr_response.content.decode().lower())


class HouseholdModuleApiTests(TestCase):
	def setUp(self):
		self.user_model = get_user_model()
		self.secretary_group, _ = Group.objects.get_or_create(name='Secretary')
		self.authorized_user = self.user_model.objects.create_user(
			username='household-secretary', password='testpass123', is_staff=True
		)
		self.authorized_user.groups.add(self.secretary_group)
		self.unauthorized_user = self.user_model.objects.create_user(
			username='household-regular', password='testpass123'
		)
		self.head = self.make_resident(
			first_name='Maria', last_name='Santos', gender='F', date_of_birth='1980-01-01'
		)
		self.member = self.make_resident(
			first_name='Juan', last_name='Santos', gender='M', date_of_birth='2010-01-01',
			voters_id='', is_pwd=True,
		)
		self.adult = self.make_resident(
			first_name='Lina', last_name='Santos', gender='F', date_of_birth='1950-01-01',
			voters_id='V-100', is_4ps_beneficiary=True,
		)
		self.client.force_login(self.authorized_user)

	def make_resident(self, **overrides):
		defaults = {
			'first_name': 'Test',
			'last_name': 'Resident',
			'gender': 'M',
			'date_of_birth': '1990-01-01',
			'zone': 'Purok Talisay',
			'house_number': '10',
			'street': 'Rizal Street',
			'voters_id': '',
		}
		defaults.update(overrides)
		return Resident.objects.create(**defaults)

	def make_household(self, code=''):
		return create_household(
			household_head=self.head,
			household_number=code,
			complete_address='10 Rizal Street, Purok Talisay, Abgao',
			purok='Purok Talisay',
		)

	def post_json(self, path, payload):
		return self.client.post(path, data=json.dumps(payload), content_type='application/json')

	def patch_json(self, path, payload):
		return self.client.patch(path, data=json.dumps(payload), content_type='application/json')

	def test_household_creation_generates_unique_stable_code_and_head_membership(self):
		response = self.post_json(
			'/api/households/',
			{
				'household_head_id': self.head.id,
				'complete_address': '10 Rizal Street, Purok Talisay, Abgao',
				'purok': 'Purok Talisay',
			},
		)
		self.assertEqual(response.status_code, 201)
		household = Household.objects.get(pk=response.json()['id'])
		self.assertRegex(household.household_number, r'^HH-\d{6}$')
		self.assertTrue(
			household.memberships.filter(
				resident=self.head,
				relationship_to_head=HouseholdMembership.Relationship.HEAD,
				status=HouseholdMembership.Status.ACTIVE,
			).exists()
		)
		other_head = self.make_resident(first_name='Second', last_name='Head')
		second_household = create_household(household_head=other_head)
		self.assertRegex(second_household.household_number, r'^HH-\d{6}$')
		self.assertNotEqual(second_household.household_number, household.household_number)

	def test_existing_household_code_is_preserved_on_update(self):
		household = self.make_household('LEGACY-001A')
		response = self.patch_json(f'/api/households/{household.id}/', {'notes': 'Updated note'})
		self.assertEqual(response.status_code, 200)
		household.refresh_from_db()
		self.assertEqual(household.household_number, 'LEGACY-001A')

	def test_household_detail_and_existing_list_endpoint_are_compatible(self):
		household = self.make_household()
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		detail = self.client.get(f'/api/households/{household.id}/')
		self.assertEqual(detail.status_code, 200)
		payload = detail.json()
		self.assertEqual(payload['head_of_household']['resident_id'], self.head.id)
		self.assertEqual(len(payload['members']), 2)
		self.assertEqual(payload['statistics']['total_members'], 2)

		listing = self.client.get('/api/households/list/')
		self.assertEqual(listing.status_code, 200)
		self.assertEqual(listing.json()['results'][0]['household_number'], household.household_number)
		self.assertEqual(listing.json()['results'][0]['member_count'], 1)

	def test_household_search_matches_code_head_member_address_purok_and_status(self):
		household = self.make_household('SEARCH-CODE')
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		for query in ('SEARCH-CODE', 'Maria', 'Juan', 'Rizal', 'Purok Talisay', 'active'):
			with self.subTest(query=query):
				response = self.client.get('/api/households/list/', {'q': query})
				self.assertEqual(response.status_code, 200)
				self.assertEqual(response.json()['count'], 1)

	def test_add_member_prevents_duplicates_and_multiple_active_households(self):
		household = self.make_household()
		first = self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		self.assertEqual(first.status_code, 201)
		duplicate = self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		self.assertEqual(duplicate.status_code, 400)

		other_head = self.make_resident(first_name='Other', last_name='Head')
		other_household = create_household(household_head=other_head)
		other = self.post_json(
			f'/api/households/{other_household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'other_relative'},
		)
		self.assertEqual(other.status_code, 400)

	def test_head_must_be_member_and_change_head_updates_roles(self):
		household = self.make_household()
		non_member = self.post_json(
			f'/api/households/{household.id}/change-head/',
			{'resident_id': self.member.id},
		)
		self.assertEqual(non_member.status_code, 400)

		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		changed = self.post_json(
			f'/api/households/{household.id}/change-head/',
			{'resident_id': self.member.id, 'previous_head_relationship': 'parent'},
		)
		self.assertEqual(changed.status_code, 200)
		household.refresh_from_db()
		self.assertEqual(household.household_head_id, self.member.id)
		self.assertEqual(
			household.memberships.get(resident=self.member).relationship_to_head,
			HouseholdMembership.Relationship.HEAD,
		)
		self.assertEqual(
			household.memberships.get(resident=self.head).relationship_to_head,
			HouseholdMembership.Relationship.PARENT,
		)
		self.assertEqual(
			household.memberships.filter(
				status=HouseholdMembership.Status.ACTIVE,
				relationship_to_head=HouseholdMembership.Relationship.HEAD,
			).count(),
			1,
		)
		self.assertEqual(
			household.memberships.filter(
				resident=self.member,
				status=HouseholdMembership.Status.ACTIVE,
			).count(),
			1,
		)

	def test_eligible_new_heads_exclude_current_head_and_inactive_members(self):
		household = self.make_household()
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.adult.id, 'relationship_to_head': 'parent'},
		)
		household.memberships.filter(resident=self.adult).update(
			status=HouseholdMembership.Status.INACTIVE,
		)

		response = self.client.get(f'/api/households/{household.id}/')

		self.assertEqual(response.status_code, 200)
		candidate_ids = {item['resident_id'] for item in response.json()['eligible_new_heads']}
		self.assertEqual(candidate_ids, {self.member.id})
		self.assertNotIn(self.head.id, candidate_ids)
		self.assertNotIn(self.adult.id, candidate_ids)

	def test_inactive_resident_cannot_become_head(self):
		household = self.make_household()
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		self.member.is_active = False
		self.member.save(update_fields=['is_active'])

		response = self.post_json(
			f'/api/households/{household.id}/change-head/',
			{'resident_id': self.member.id, 'previous_head_relationship': 'parent'},
		)

		self.assertEqual(response.status_code, 400)
		household.refresh_from_db()
		self.assertEqual(household.household_head_id, self.head.id)

	def test_database_prevents_duplicate_active_head(self):
		household = self.make_household()
		membership = HouseholdMembership.objects.create(
			household=household,
			resident=self.member,
			relationship_to_head=HouseholdMembership.Relationship.CHILD,
		)

		with self.assertRaises(IntegrityError), transaction.atomic():
			membership.relationship_to_head = HouseholdMembership.Relationship.HEAD
			membership.save(update_fields=['relationship_to_head'])

		membership.refresh_from_db()
		self.assertEqual(membership.relationship_to_head, HouseholdMembership.Relationship.CHILD)

	def test_change_head_rolls_back_all_changes_when_final_save_fails(self):
		household = self.make_household()
		member_membership = HouseholdMembership.objects.create(
			household=household,
			resident=self.member,
			relationship_to_head=HouseholdMembership.Relationship.CHILD,
		)

		with patch.object(Household, 'save', side_effect=RuntimeError('forced failure')):
			with self.assertRaisesRegex(RuntimeError, 'forced failure'):
				change_household_head(
					household=household,
					new_head=self.member,
					previous_head_relationship=HouseholdMembership.Relationship.PARENT,
				)

		household.refresh_from_db()
		member_membership.refresh_from_db()
		previous_membership = household.memberships.get(resident=self.head)
		self.assertEqual(household.household_head_id, self.head.id)
		self.assertEqual(previous_membership.relationship_to_head, HouseholdMembership.Relationship.HEAD)
		self.assertEqual(member_membership.relationship_to_head, HouseholdMembership.Relationship.CHILD)

	def test_full_name_formatter_removes_trailing_separators(self):
		resident = self.make_resident(
			first_name='GEMI,',
			middle_name='GLORIA;',
			last_name='IRONG,',
			suffix='',
		)

		self.assertEqual(resident.full_name, 'GEMI GLORIA IRONG')
		self.assertEqual(str(resident), 'GEMI GLORIA IRONG')

	def test_cannot_remove_head_but_can_remove_ordinary_member(self):
		household = self.make_household()
		remove_head = self.client.delete(f'/api/households/{household.id}/members/{self.head.id}/')
		self.assertEqual(remove_head.status_code, 400)
		self.post_json(
			f'/api/households/{household.id}/members/',
			{'resident_id': self.member.id, 'relationship_to_head': 'child'},
		)
		removed = self.client.delete(f'/api/households/{household.id}/members/{self.member.id}/')
		self.assertEqual(removed.status_code, 204)
		membership = household.memberships.get(resident=self.member)
		self.assertEqual(membership.status, HouseholdMembership.Status.INACTIVE)
		self.assertIsNotNone(membership.left_date)

	def test_household_statistics_use_current_active_members(self):
		household = self.make_household()
		for resident, relationship in ((self.member, 'child'), (self.adult, 'parent')):
			self.post_json(
				f'/api/households/{household.id}/members/',
				{'resident_id': resident.id, 'relationship_to_head': relationship},
			)
		response = self.client.get(f'/api/households/{household.id}/statistics/')
		self.assertEqual(response.status_code, 200)
		stats = response.json()
		self.assertEqual(stats['total_members'], 3)
		self.assertEqual(stats['children_count'], 1)
		self.assertEqual(stats['adult_count'], 2)
		self.assertEqual(stats['senior_citizen_count'], 1)
		self.assertEqual(stats['male_count'], 1)
		self.assertEqual(stats['female_count'], 2)
		self.assertEqual(stats['voter_count'], 1)
		self.assertEqual(stats['pwd_count'], 1)
		self.assertEqual(stats['four_ps_beneficiary_count'], 1)

	def test_archive_and_deactivate_household(self):
		household = self.make_household()
		response = self.post_json(f'/api/households/{household.id}/archive/', {'status': 'archived'})
		self.assertEqual(response.status_code, 200)
		household.refresh_from_db()
		self.assertEqual(household.status, Household.Status.ARCHIVED)

	def test_household_endpoints_require_an_authorized_office_role(self):
		self.client.logout()
		anonymous = self.client.get('/api/households/list/')
		self.assertIn(anonymous.status_code, {401, 403})
		self.client.force_login(self.unauthorized_user)
		unauthorized = self.client.get('/api/households/list/')
		self.assertEqual(unauthorized.status_code, 403)
		self.client.force_login(self.authorized_user)
		authorized = self.client.get('/api/households/list/')
		self.assertEqual(authorized.status_code, 200)
