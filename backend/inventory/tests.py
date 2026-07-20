from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from io import StringIO
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from .models import Asset, Category


class AssetEditViewTests(TestCase):
	def setUp(self):
		secretary_group, _ = Group.objects.get_or_create(name='Secretary')
		self.user = get_user_model().objects.create_user(username='inventory-user', password='testpass123')
		self.staff_user = get_user_model().objects.create_user(
			username='inventory-staff',
			password='testpass123',
			is_staff=True,
		)
		self.staff_user.groups.add(secretary_group)
		self.category = Category.objects.create(name=Category.NameChoices.ICT_EQUIPMENT)
		self.asset = Asset.objects.create(
			property_number='INV-001',
			category=self.category,
			description='Office printer',
			condition=Asset.ConditionChoices.UNSERVICEABLE,
		)
		self.other_category = Category.objects.create(name=Category.NameChoices.OFFICE_FURNITURE)
		self.other_asset = Asset.objects.create(
			property_number='ABG-FUR-2026-0003',
			category=self.other_category,
			description='Office table',
			condition=Asset.ConditionChoices.GOOD,
		)

	def test_asset_edit_page_renders_for_logged_in_user(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('inventory:asset_edit', args=[self.asset.id]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Asset Update Form')
		self.assertContains(response, self.asset.property_number)

	def test_asset_edit_updates_condition_and_redirects_to_next_url(self):
		self.client.force_login(self.user)

		response = self.client.post(
			reverse('inventory:asset_edit', args=[self.asset.id]),
			{
				'condition': Asset.ConditionChoices.FOR_DISPOSAL,
				'status': Asset.StatusChoices.UNDER_REPAIR,
				'location': Asset.LocationChoices.BARANGAY_OFFICE,
				'responsible_person': '',
				'responsible_role': Asset.ResponsibleRoleChoices.BARANGAY_SECRETARY,
				'next_inspection_date': '2026-08-01',
				'last_inventory_date': '2026-07-01',
				'notes': 'Queued for disposal review.',
				'next': reverse('inventory:report_damaged_items'),
			},
		)

		self.assertRedirects(response, reverse('inventory:report_damaged_items'))
		self.asset.refresh_from_db()
		self.assertEqual(self.asset.condition, Asset.ConditionChoices.FOR_DISPOSAL)
		self.assertEqual(self.asset.status, Asset.StatusChoices.UNDER_REPAIR)
		self.assertEqual(self.asset.location, Asset.LocationChoices.BARANGAY_OFFICE)
		self.assertEqual(self.asset.responsible_role, Asset.ResponsibleRoleChoices.BARANGAY_SECRETARY)
		self.assertEqual(self.asset.notes, 'Queued for disposal review.')

	def test_mark_as_damaged_sets_unserviceable_and_under_repair(self):
		self.client.force_login(self.user)
		self.asset.condition = Asset.ConditionChoices.GOOD
		self.asset.status = Asset.StatusChoices.LOST
		self.asset.save(update_fields=['condition', 'status'])

		response = self.client.post(
			reverse('inventory:asset_mark_damaged', args=[self.asset.id]),
			{'next': reverse('inventory:report_missing_items')},
		)

		self.assertRedirects(response, reverse('inventory:report_missing_items'))
		self.asset.refresh_from_db()
		self.assertEqual(self.asset.condition, Asset.ConditionChoices.UNSERVICEABLE)
		self.assertEqual(self.asset.status, Asset.StatusChoices.UNDER_REPAIR)

	def test_mark_as_missing_sets_lost_status(self):
		self.client.force_login(self.user)
		self.asset.condition = Asset.ConditionChoices.GOOD
		self.asset.status = Asset.StatusChoices.ACTIVE
		self.asset.save(update_fields=['condition', 'status'])

		response = self.client.post(
			reverse('inventory:asset_mark_missing', args=[self.asset.id]),
			{'next': reverse('inventory:report_damaged_items')},
		)

		self.assertRedirects(response, reverse('inventory:report_damaged_items'))
		self.asset.refresh_from_db()
		self.assertEqual(self.asset.condition, Asset.ConditionChoices.GOOD)
		self.assertEqual(self.asset.status, Asset.StatusChoices.LOST)

	def test_missing_items_report_contains_damaged_shortcut(self):
		self.client.force_login(self.user)
		self.asset.status = Asset.StatusChoices.LOST
		self.asset.save(update_fields=['status'])

		response = self.client.get(reverse('inventory:report_missing_items'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Mark as Damaged')
		self.assertContains(response, reverse('inventory:asset_edit', args=[self.asset.id]))

	def test_asset_create_creates_record_and_redirects_to_next_url(self):
		self.client.force_login(self.user)

		response = self.client.post(
			reverse('inventory:asset_create'),
			{
				'property_number': '',
				'category': self.category.id,
				'description': 'Newly encoded monitor',
				'serial_number': 'SN-12345',
				'brand_model': 'Brand Model X',
				'date_acquired': '2026-07-01',
				'cost': '4500.00',
				'funding_source': Asset.FundingSourceChoices.BARANGAY_FUND,
				'supplier': 'Local Supplier',
				'useful_life_years': '5',
				'condition': Asset.ConditionChoices.GOOD,
				'location': Asset.LocationChoices.BARANGAY_HALL,
				'responsible_person': '',
				'responsible_role': Asset.ResponsibleRoleChoices.BARANGAY_SECRETARY,
				'next_inspection_date': '2026-08-01',
				'status': Asset.StatusChoices.ACTIVE,
				'last_inventory_date': '2026-07-01',
				'notes': 'Encoded during test.',
				'next': reverse('inventory:item_list'),
			},
		)

		self.assertRedirects(response, reverse('inventory:item_list'))
		created_asset = Asset.objects.get(description='Newly encoded monitor')
		self.assertRegex(created_asset.property_number, r'^LA-\d{4}$')

	def test_asset_registry_search_filters_assets(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('inventory:item_list'), {'q': 'table'})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Office table')
		self.assertNotContains(response, 'Office printer')
		self.assertContains(response, 'value="table"', html=False)

	def test_asset_registry_search_shows_empty_state_for_no_matches(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('inventory:item_list'), {'q': 'nonexistent asset'})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'No assets found for')
		self.assertContains(response, 'nonexistent asset')

	def test_asset_registry_accepts_rows_per_page_query_param(self):
		self.client.force_login(self.user)

		for idx in range(15):
			Asset.objects.create(
				property_number=f'INV-PP-{idx:03d}',
				category=self.category,
				description=f'Pagination asset {idx}',
			)

		response = self.client.get(reverse('inventory:item_list'), {'per_page': '10'})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.context['selected_per_page'], 10)
		self.assertEqual(response.context['page_obj'].paginator.per_page, 10)

	def test_asset_create_preserves_manual_legacy_property_number(self):
		self.client.force_login(self.user)

		response = self.client.post(
			reverse('inventory:asset_create'),
			{
				'property_number': 'ABG-ICT-2026-0001',
				'category': self.category.id,
				'description': 'Legacy encoded workstation',
				'serial_number': 'LEG-123',
				'brand_model': 'Legacy Brand',
				'date_acquired': '2026-07-01',
				'cost': '6500.00',
				'funding_source': Asset.FundingSourceChoices.BARANGAY_FUND,
				'supplier': 'Legacy Supplier',
				'useful_life_years': '5',
				'condition': Asset.ConditionChoices.GOOD,
				'location': Asset.LocationChoices.BARANGAY_HALL,
				'responsible_person': '',
				'responsible_role': Asset.ResponsibleRoleChoices.BARANGAY_SECRETARY,
				'next_inspection_date': '2026-08-01',
				'status': Asset.StatusChoices.ACTIVE,
				'last_inventory_date': '2026-07-01',
				'notes': 'Legacy current code kept.',
				'next': reverse('inventory:item_list'),
			},
		)

		self.assertRedirects(response, reverse('inventory:item_list'))
		self.assertTrue(Asset.objects.filter(property_number='ABG-ICT-2026-0001').exists())

	def test_inventory_index_hides_staff_tools_for_non_staff(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('inventory:index'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Admin-only tools such as Load Sample Entries and Governance and Accountability Assessment are hidden on this account.')
		self.assertNotContains(response, reverse('inventory:legacy_values_audit'))

	def test_inventory_index_shows_staff_tools_for_staff_user(self):
		self.client.force_login(self.staff_user)

		response = self.client.get(reverse('inventory:index'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Staff Tools')
		self.assertContains(response, reverse('inventory:legacy_values_audit'))

	def test_legacy_audit_export_returns_csv_rows(self):
		self.client.force_login(self.staff_user)
		Asset.objects.create(
			property_number='INV-LEGACY-001',
			category=self.category,
			description='Legacy hall asset',
			location='Brgy Hall',
		)

		response = self.client.get(reverse('inventory:legacy_values_audit_export'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response['Content-Type'], 'text/csv')
		self.assertContains(response, 'section,section_key,value,count,suggestion', status_code=200)
		self.assertContains(response, 'Asset.location,location,Brgy Hall,1,barangay_hall', status_code=200)

	def test_legacy_audit_fix_reassigns_assets_to_standard_category(self):
		self.client.force_login(self.staff_user)
		legacy_category = Category.objects.create(name='Furniture')
		legacy_asset = Asset.objects.create(
			property_number='INV-LEGACY-002',
			category=legacy_category,
			description='Legacy furniture asset',
		)

		response = self.client.post(
			reverse('inventory:legacy_values_audit_fix'),
			{
				'section_key': 'category',
				'raw_value': 'Furniture',
				'limit': '50',
			},
		)

		self.assertRedirects(response, f"{reverse('inventory:legacy_values_audit')}?limit=50")
		legacy_asset.refresh_from_db()
		self.assertEqual(legacy_asset.category_id, self.other_category.id)
		self.assertFalse(Category.objects.filter(id=legacy_category.id).exists())

	def test_legacy_audit_export_is_forbidden_for_non_staff(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('inventory:legacy_values_audit_export'))

		self.assertEqual(response.status_code, 403)

	def test_asset_delete_removes_record_and_redirects_to_next_url(self):
		self.client.force_login(self.user)
		asset_to_delete = Asset.objects.create(
			property_number='INV-DEL-001',
			category=self.category,
			description='Asset to delete',
		)

		response = self.client.post(
			reverse('inventory:asset_delete', args=[asset_to_delete.id]),
			{'next': reverse('inventory:item_list')},
		)

		self.assertRedirects(response, reverse('inventory:item_list'))
		self.assertFalse(Asset.objects.filter(id=asset_to_delete.id).exists())


class NormalizeInventoryPropertyNumbersCommandTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(name=Category.NameChoices.OFFICE_FURNITURE)
		self.legacy_abg = Asset.objects.create(
			property_number='ABG-FUR-2026-0003',
			category=self.category,
			description='Legacy ABG asset',
		)
		self.legacy_inv = Asset.objects.create(
			property_number='INV-001',
			category=self.category,
			description='Legacy INV asset',
		)
		self.existing_la = Asset.objects.create(
			property_number='LA-0007',
			category=self.category,
			description='Already normalized asset',
		)

	def test_normalize_property_numbers_dry_run_only(self):
		stdout = StringIO()

		call_command('normalize_inventory_property_numbers', stdout=stdout)

		self.legacy_abg.refresh_from_db()
		self.legacy_inv.refresh_from_db()
		self.assertEqual(self.legacy_abg.property_number, 'ABG-FUR-2026-0003')
		self.assertEqual(self.legacy_inv.property_number, 'INV-001')
		self.assertIn('DRY RUN ONLY', stdout.getvalue())

	def test_normalize_property_numbers_apply_updates_only_legacy_codes(self):
		stdout = StringIO()

		call_command('normalize_inventory_property_numbers', '--apply', stdout=stdout)

		self.legacy_abg.refresh_from_db()
		self.legacy_inv.refresh_from_db()
		self.existing_la.refresh_from_db()

		self.assertEqual(self.legacy_abg.property_number, 'LA-0008')
		self.assertEqual(self.legacy_inv.property_number, 'LA-0009')
		self.assertEqual(self.existing_la.property_number, 'LA-0007')
		self.assertIn('Done. Updated 2 asset(s).', stdout.getvalue())
