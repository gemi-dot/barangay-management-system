from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Asset, Category


class AssetEditViewTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username='inventory-user', password='testpass123')
		self.category = Category.objects.create(name=Category.NameChoices.ICT_EQUIPMENT)
		self.asset = Asset.objects.create(
			property_number='INV-001',
			category=self.category,
			description='Office printer',
			condition=Asset.ConditionChoices.UNSERVICEABLE,
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
