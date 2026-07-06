from django.contrib import admin

from .models import Asset, Assignment, Category, Maintenance


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	list_display = ('name', 'is_active', 'updated_at')
	list_filter = ('is_active',)
	search_fields = ('name',)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
	list_display = (
		'property_number',
		'category',
		'status',
		'condition',
		'funding_source',
		'location',
		'responsible_role',
		'responsible_person',
		'date_acquired',
	)
	list_filter = ('category', 'status', 'condition', 'funding_source', 'location', 'responsible_role')
	search_fields = ('property_number', 'description', 'serial_number', 'brand_model', 'supplier', 'qr_code')
	readonly_fields = ('qr_code', 'qr_image', 'created_at', 'updated_at')


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
	list_display = (
		'asset',
		'accountable_person',
		'date_issued',
		'returned_date',
		'condition_on_return',
	)
	list_filter = ('date_issued', 'returned_date', 'condition_on_return')
	search_fields = ('asset__property_number', 'accountable_person__username')


@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
	list_display = ('asset', 'maintenance_type', 'maintenance_date', 'cost', 'technician')
	list_filter = ('maintenance_type', 'maintenance_date')
	search_fields = ('asset__property_number', 'technician', 'remarks')
