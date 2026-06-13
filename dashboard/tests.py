from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from bhw_reports.models import SeniorCitizenReport
from residents.models import Household, Resident, ResidentServiceLog


class HouseholdReportTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(
			username='staff',
			password='testpass123',
		)
		self.client.force_login(self.user)

		self.head = Resident.objects.create(
			first_name='Ana',
			middle_name='B',
			last_name='Santos',
			suffix='',
			gender='F',
			date_of_birth='1985-01-01',
			place_of_birth='Maasin City',
			civil_status='single',
			citizenship='FILIPINO',
			house_number='1',
			street='Rizal Street',
			zone='Purok Talisay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='college',
			employment_status='employed',
			occupation='Teacher',
			monthly_income='15000.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)
		self.member = Resident.objects.create(
			first_name='Ben',
			middle_name='C',
			last_name='Santos',
			suffix='',
			gender='M',
			date_of_birth='2010-02-02',
			place_of_birth='Maasin City',
			civil_status='single',
			citizenship='FILIPINO',
			house_number='1',
			street='Rizal Street',
			zone='Purok Talisay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='high_school',
			employment_status='student',
			occupation='Student',
			monthly_income='0.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)
		self.household = Household.objects.create(
			household_head=self.head,
			household_number='HH-001',
			house_ownership='owned',
			total_monthly_income='15000.00',
		)
		self.household.members.add(self.member)

		self.other_head = Resident.objects.create(
			first_name='Liza',
			middle_name='K',
			last_name='Reyes',
			suffix='',
			gender='F',
			date_of_birth='1970-01-01',
			place_of_birth='Maasin City',
			civil_status='married',
			citizenship='FILIPINO',
			house_number='9',
			street='Burgos Street',
			zone='Purok Malunggay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='college',
			employment_status='employed',
			occupation='Vendor',
			monthly_income='8000.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)
		self.other_household = Household.objects.create(
			household_head=self.other_head,
			household_number='HH-002',
			house_ownership='owned',
			total_monthly_income='8000.00',
		)

	def test_household_report_shows_members_under_household_head(self):
		response = self.client.get(reverse('dashboard:household_report'))

		self.assertEqual(response.status_code, 200)
		grouped_households = response.context['grouped_households']
		household_item = grouped_households['Purok Talisay'][0]

		self.assertEqual(household_item['members'][0], self.member)
		self.assertContains(response, self.head.full_name)
		self.assertContains(response, self.member.full_name)

	def test_household_report_filters_by_purok(self):
		response = self.client.get(reverse('dashboard:household_report'), {'zone': 'Purok Talisay'})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['zone_filter'], 'Purok Talisay')
		self.assertEqual(response.context['total_households'], 1)
		self.assertIn('Purok Talisay', response.context['grouped_households'])
		self.assertNotIn('Purok Malunggay', response.context['grouped_households'])
		self.assertContains(response, self.head.full_name)
		self.assertNotContains(response, self.other_head.full_name)


class DashboardViewTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(
			username='dashboard-staff',
			password='testpass123',
		)
		self.client.force_login(self.user)

		self.resident = Resident.objects.create(
			first_name='Cara',
			middle_name='D',
			last_name='Lopez',
			suffix='',
			gender='F',
			date_of_birth='1990-03-03',
			place_of_birth='Maasin City',
			civil_status='single',
			citizenship='FILIPINO',
			house_number='2',
			street='Bonifacio Street',
			zone='Purok Talisay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='college',
			employment_status='employed',
			occupation='Clerk',
			monthly_income='12000.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)

	def test_dashboard_shows_distinct_visitors_today_count(self):
		ResidentServiceLog.objects.create(
			resident=self.resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='First visit log.',
		)
		ResidentServiceLog.objects.create(
			resident=self.resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Duplicate visit log same day.',
		)
		ResidentServiceLog.objects.create(
			resident=self.resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_SCANNED_QR,
			notes='Different action.',
		)

		response = self.client.get(reverse('dashboard:dashboard'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['visitors_today_count'], 1)
		self.assertContains(response, 'Visitors Today')

	def test_dashboard_ignores_old_visit_logs(self):
		old_log = ResidentServiceLog.objects.create(
			resident=self.resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Old visit log.',
		)
		old_log.created_at = timezone.now() - timezone.timedelta(days=1)
		old_log.save(update_fields=['created_at'])

		response = self.client.get(reverse('dashboard:dashboard'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['visitors_today_count'], 0)

	def test_dashboard_links_to_todays_visitors_report(self):
		response = self.client.get(reverse('dashboard:dashboard'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, reverse('dashboard:today_visitors_report'))


class TodayVisitorsReportTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(
			username='visitors-staff',
			password='testpass123',
		)
		self.client.force_login(self.user)

		self.first_resident = Resident.objects.create(
			first_name='Dana',
			middle_name='E',
			last_name='Ramos',
			suffix='',
			gender='F',
			date_of_birth='1992-04-04',
			place_of_birth='Maasin City',
			civil_status='single',
			citizenship='FILIPINO',
			house_number='3',
			street='Mabini Street',
			zone='Purok Talisay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='college',
			employment_status='employed',
			occupation='Cashier',
			monthly_income='11000.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)
		self.second_resident = Resident.objects.create(
			first_name='Eli',
			middle_name='F',
			last_name='Torres',
			suffix='',
			gender='M',
			date_of_birth='1988-05-05',
			place_of_birth='Maasin City',
			civil_status='married',
			citizenship='FILIPINO',
			house_number='4',
			street='Del Pilar Street',
			zone='Purok Malunggay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='college',
			employment_status='employed',
			occupation='Driver',
			monthly_income='14000.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
		)

	def test_today_visitors_report_lists_distinct_names(self):
		ResidentServiceLog.objects.create(
			resident=self.first_resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='First resident visit.',
		)
		ResidentServiceLog.objects.create(
			resident=self.first_resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Duplicate entry.',
		)
		ResidentServiceLog.objects.create(
			resident=self.second_resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Second resident visit.',
		)

		response = self.client.get(reverse('dashboard:today_visitors_report'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['visitors_today_count'], 2)
		self.assertEqual(len(response.context['visitor_logs']), 2)
		self.assertContains(response, self.first_resident.full_name)
		self.assertContains(response, self.second_resident.full_name)

	def test_today_visitors_report_ignores_non_today_logs(self):
		old_log = ResidentServiceLog.objects.create(
			resident=self.first_resident,
			logged_by=self.user,
			action=ResidentServiceLog.ACTION_VISITED_TODAY,
			notes='Old visitor entry.',
		)
		old_log.created_at = timezone.now() - timezone.timedelta(days=1)
		old_log.save(update_fields=['created_at'])

		response = self.client.get(reverse('dashboard:today_visitors_report'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['visitors_today_count'], 0)
		self.assertContains(response, 'No visitors logged today')


class SeniorCitizensReportTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(
			username='senior-staff',
			password='testpass123',
		)
		self.client.force_login(self.user)

		self.talisay_senior = Resident.objects.create(
			first_name='Felisa',
			middle_name='G',
			last_name='Navarro',
			suffix='',
			gender='F',
			date_of_birth='1940-06-06',
			place_of_birth='Maasin City',
			civil_status='widowed',
			citizenship='FILIPINO',
			house_number='5',
			street='Quezon Street',
			zone='Purok Talisay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='elementary',
			employment_status='retired',
			occupation='Retired',
			monthly_income='0.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
			is_senior_citizen=True,
		)
		self.malunggay_senior = Resident.objects.create(
			first_name='Gorio',
			middle_name='H',
			last_name='Ponce',
			suffix='',
			gender='M',
			date_of_birth='1942-07-07',
			place_of_birth='Maasin City',
			civil_status='married',
			citizenship='FILIPINO',
			house_number='6',
			street='Luna Street',
			zone='Purok Malunggay',
			barangay='ABGAO',
			city_municipality='MAASIN',
			province='SOUTHERN LEYTE',
			zip_code='6600',
			educational_attainment='elementary',
			employment_status='retired',
			occupation='Retired',
			monthly_income='0.00',
			emergency_contact_name='N/A',
			emergency_contact_number='N/A',
			emergency_contact_relationship='N/A',
			is_senior_citizen=True,
		)

		SeniorCitizenReport.objects.create(
			resident=self.talisay_senior,
			mobility_status='independent',
			health_conditions='Hypertension',
		)
		SeniorCitizenReport.objects.create(
			resident=self.malunggay_senior,
			mobility_status='assisted',
			health_conditions='Arthritis',
		)

	def test_senior_citizens_report_filters_by_purok(self):
		response = self.client.get(reverse('dashboard:senior_citizens_report'), {'zone': 'Purok Talisay'})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['zone_filter'], 'Purok Talisay')
		self.assertEqual(list(response.context['senior_citizens']), [self.talisay_senior])
		self.assertEqual(list(response.context['senior_reports']), [self.talisay_senior.senior_citizen_report])
		self.assertContains(response, self.talisay_senior.full_name)
		self.assertNotContains(response, self.malunggay_senior.full_name)
		self.assertContains(response, 'All Puroks')
