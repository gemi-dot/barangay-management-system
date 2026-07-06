from io import BytesIO
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import IntegrityError, models
from django.utils import timezone
import qrcode


class Category(models.Model):
	class NameChoices(models.TextChoices):
		ICT_EQUIPMENT = 'ict_equipment', 'ICT Equipment'
		OFFICE_FURNITURE = 'office_furniture', 'Office Furniture'
		OFFICE_EQUIPMENT = 'office_equipment', 'Office Equipment'
		MEDICAL_EQUIPMENT = 'medical_equipment', 'Medical Equipment'
		DISASTER_EQUIPMENT = 'disaster_equipment', 'Disaster Equipment'
		SAFETY_EQUIPMENT = 'safety_equipment', 'Safety Equipment'
		COMMUNICATION_EQUIPMENT = 'communication_equipment', 'Communication Equipment'
		VEHICLE = 'vehicle', 'Vehicle'
		HEAVY_EQUIPMENT = 'heavy_equipment', 'Heavy Equipment'
		TOOLS_AND_EQUIPMENT = 'tools_and_equipment', 'Tools & Equipment'
		BUILDINGS = 'buildings', 'Buildings'
		INFRASTRUCTURE = 'infrastructure', 'Infrastructure'
		SPORTS_EQUIPMENT = 'sports_equipment', 'Sports Equipment'
		ELECTRICAL_EQUIPMENT = 'electrical_equipment', 'Electrical Equipment'

	name = models.CharField(max_length=50, choices=NameChoices.choices, unique=True)
	description = models.TextField(blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['name']
		verbose_name = 'Category'
		verbose_name_plural = 'Categories'

	def __str__(self):
		return self.get_name_display()


class Asset(models.Model):
	class ConditionChoices(models.TextChoices):
		EXCELLENT = 'excellent', 'Excellent'
		VERY_GOOD = 'very_good', 'Very Good'
		GOOD = 'good', 'Good'
		FAIR = 'fair', 'Fair'
		POOR = 'poor', 'Poor'
		UNSERVICEABLE = 'unserviceable', 'Unserviceable'
		FOR_DISPOSAL = 'for_disposal', 'For Disposal'

	class LocationChoices(models.TextChoices):
		BARANGAY_HALL = 'barangay_hall', 'Barangay Hall'
		BARANGAY_OFFICE = 'barangay_office', 'Barangay Office'
		HEALTH_CENTER = 'health_center', 'Health Center'
		MULTI_PURPOSE_HALL = 'multi_purpose_hall', 'Multi-Purpose Hall'
		COVERED_COURT = 'covered_court', 'Covered Court'
		SESSION_HALL = 'session_hall', 'Session Hall'
		DRRM_STORAGE = 'drrm_storage', 'DRRM Storage'
		RECORDS_ROOM = 'records_room', 'Records Room'
		STORAGE_ROOM = 'storage_room', 'Storage Room'
		GARAGE = 'garage', 'Garage'
		DAY_CARE_CENTER = 'day_care_center', 'Day Care Center'
		SENIOR_CITIZEN_CENTER = 'senior_citizen_center', 'Senior Citizen Center'

	class ResponsibleRoleChoices(models.TextChoices):
		PUNONG_BARANGAY = 'punong_barangay', 'Punong Barangay'
		BARANGAY_SECRETARY = 'barangay_secretary', 'Barangay Secretary'
		BARANGAY_TREASURER = 'barangay_treasurer', 'Barangay Treasurer'
		BARANGAY_KAGAWAD = 'barangay_kagawad', 'Barangay Kagawad'
		BARANGAY_HEALTH_WORKER = 'barangay_health_worker', 'Barangay Health Worker'
		BARANGAY_NUTRITION_SCHOLAR = 'barangay_nutrition_scholar', 'Barangay Nutrition Scholar'
		DRRM_COORDINATOR = 'drrm_coordinator', 'DRRM Coordinator'
		SK_CHAIRMAN = 'sk_chairman', 'SK Chairman'
		UTILITY_WORKER = 'utility_worker', 'Utility Worker'
		ADMINISTRATIVE_AIDE = 'administrative_aide', 'Administrative Aide'

	class FundingSourceChoices(models.TextChoices):
		BARANGAY_FUND = 'barangay_fund', 'Barangay Fund'
		DEVELOPMENT_FUND_20 = 'development_fund_20', '20% Development Fund'
		DRRM_FUND = 'drrm_fund', 'DRRM Fund'
		DONATION = 'donation', 'Donation'
		OTHER = 'other', 'Other'

	class StatusChoices(models.TextChoices):
		ACTIVE = 'active', 'Active'
		LOST = 'lost', 'Lost'
		UNDER_REPAIR = 'under_repair', 'Under Repair'
		DISPOSED = 'disposed', 'Disposed'

	property_number = models.CharField(max_length=80, unique=True)
	category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='assets')
	description = models.TextField()
	serial_number = models.CharField(max_length=120, blank=True)
	brand_model = models.CharField(max_length=150, blank=True)
	date_acquired = models.DateField(blank=True, null=True)
	cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
	funding_source = models.CharField(
		max_length=30,
		choices=FundingSourceChoices.choices,
		blank=True,
		default=FundingSourceChoices.BARANGAY_FUND,
	)
	supplier = models.CharField(max_length=150, blank=True)
	useful_life_years = models.PositiveIntegerField(blank=True, null=True)
	condition = models.CharField(max_length=20, choices=ConditionChoices.choices, default=ConditionChoices.GOOD)
	location = models.CharField(
		max_length=40,
		choices=LocationChoices.choices,
		default=LocationChoices.BARANGAY_HALL,
		verbose_name='Current location',
	)
	responsible_person = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='inventory_assets',
	)
	responsible_role = models.CharField(
		max_length=40,
		choices=ResponsibleRoleChoices.choices,
		blank=True,
	)
	next_inspection_date = models.DateField(blank=True, null=True)
	status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
	qr_code = models.CharField(max_length=16, unique=True, editable=False, blank=True)
	qr_image = models.ImageField(upload_to='asset_qr_codes/', blank=True, null=True, editable=False)
	last_inventory_date = models.DateField(blank=True, null=True)
	notes = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['property_number']
		verbose_name = 'Asset'
		verbose_name_plural = 'Assets'

	def __str__(self):
		return f"{self.property_number} - {self.description[:50]}"

	def save(self, *args, **kwargs):
		self._ensure_qr_code()

		update_fields = kwargs.get('update_fields')
		if update_fields is not None and 'qr_code' not in update_fields:
			kwargs['update_fields'] = list(set(update_fields) | {'qr_code'})

		super().save(*args, **kwargs)

		if not self.qr_image:
			self._generate_qr_image()
			type(self).objects.filter(pk=self.pk).update(qr_image=self.qr_image.name)

	def _ensure_qr_code(self):
		if self.qr_code:
			return

		for _ in range(10):
			code = uuid.uuid4().hex[:16].upper()
			if not type(self).objects.filter(qr_code=code).exists():
				self.qr_code = code
				return

		raise IntegrityError('Could not generate a unique QR code for asset.')

	def _qr_payload(self):
		return f"BRGY-ASSET:{self.qr_code}"

	def _generate_qr_image(self):
		qr = qrcode.QRCode(
			version=1,
			error_correction=qrcode.constants.ERROR_CORRECT_M,
			box_size=8,
			border=2,
		)
		qr.add_data(self._qr_payload())
		qr.make(fit=True)

		image = qr.make_image(fill_color='black', back_color='white')
		image_io = BytesIO()
		image.save(image_io, format='PNG')

		filename = f"asset_{self.qr_code}.png"
		self.qr_image.save(filename, ContentFile(image_io.getvalue()), save=False)


class Assignment(models.Model):
	asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
	accountable_person = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name='asset_assignments',
	)
	date_issued = models.DateField(default=timezone.localdate)
	returned_date = models.DateField(blank=True, null=True)
	condition_on_return = models.CharField(
		max_length=20,
		choices=Asset.ConditionChoices.choices,
		blank=True,
	)
	remarks = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-date_issued', '-created_at']
		verbose_name = 'Assignment'
		verbose_name_plural = 'Assignments'

	def __str__(self):
		return f"{self.asset.property_number} assigned to {self.accountable_person}"


class Maintenance(models.Model):
	class MaintenanceTypeChoices(models.TextChoices):
		REPAIR = 'repair', 'Repair'
		PREVENTIVE = 'preventive', 'Preventive Maintenance'
		INSPECTION = 'inspection', 'Inspection'
		OTHER = 'other', 'Other'

	asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records')
	maintenance_type = models.CharField(
		max_length=20,
		choices=MaintenanceTypeChoices.choices,
		default=MaintenanceTypeChoices.REPAIR,
	)
	maintenance_date = models.DateField(default=timezone.localdate)
	cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
	technician = models.CharField(max_length=150, blank=True)
	remarks = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-maintenance_date', '-created_at']
		verbose_name = 'Maintenance Record'
		verbose_name_plural = 'Maintenance Records'

	def __str__(self):
		return f"{self.asset.property_number} - {self.get_maintenance_type_display()}"
