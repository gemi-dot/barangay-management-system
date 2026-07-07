from django.urls import path

from . import views

app_name = 'inventory'

urlpatterns = [
	path('', views.index, name='index'),
	path('samples/load/', views.load_sample_entries, name='load_sample_entries'),
	path('audit/legacy-values/', views.legacy_values_audit, name='legacy_values_audit'),
	path('audit/legacy-values/export/', views.legacy_values_audit_export, name='legacy_values_audit_export'),
	path('audit/legacy-values/fix/', views.legacy_values_audit_fix, name='legacy_values_audit_fix'),
	path('items/', views.item_list, name='item_list'),
	path('items/generate-code/', views.generate_asset_code, name='generate_asset_code'),
	path('registers/active/', views.register_active_assets, name='register_active_assets'),
	path('registers/active/print/', views.register_active_assets_print, name='register_active_assets_print'),
	path('registers/active/export/', views.register_active_assets_export, name='register_active_assets_export'),
	path('registers/legacy/', views.register_legacy_assets, name='register_legacy_assets'),
	path('registers/legacy/print/', views.register_legacy_assets_print, name='register_legacy_assets_print'),
	path('registers/legacy/export/', views.register_legacy_assets_export, name='register_legacy_assets_export'),
	path('registers/disposal-evaluation/', views.register_disposal_evaluation, name='register_disposal_evaluation'),
	path('registers/disposal-evaluation/print/', views.register_disposal_evaluation_print, name='register_disposal_evaluation_print'),
	path('registers/disposal-evaluation/export/', views.register_disposal_evaluation_export, name='register_disposal_evaluation_export'),
	path('items/add/', views.asset_create, name='asset_create'),
	path('items/<int:asset_id>/mark-damaged/', views.asset_mark_damaged, name='asset_mark_damaged'),
	path('items/<int:asset_id>/mark-missing/', views.asset_mark_missing, name='asset_mark_missing'),
	path('items/<int:asset_id>/delete/', views.asset_delete, name='asset_delete'),
	path('items/<int:asset_id>/edit/', views.asset_edit, name='asset_edit'),
	path('items/<int:asset_id>/', views.asset_detail, name='asset_detail'),
	path('stock-in/', views.stock_in, name='stock_in'),
	path('stock-out/', views.stock_out, name='stock_out'),
	path('scan/<str:qr_code>/', views.scan_asset_qr, name='scan_asset_qr'),
	path('reports/by-office/', views.report_assets_by_office, name='report_assets_by_office'),
	path('reports/by-office/print/', views.report_assets_by_office_print, name='report_assets_by_office_print'),
	path('reports/by-category/', views.report_assets_by_category, name='report_assets_by_category'),
	path('reports/by-category/print/', views.report_assets_by_category_print, name='report_assets_by_category_print'),
	path('reports/damaged-items/', views.report_damaged_items, name='report_damaged_items'),
	path('reports/damaged-items/print/', views.report_damaged_items_print, name='report_damaged_items_print'),
	path('reports/missing-items/', views.report_missing_items, name='report_missing_items'),
	path('reports/missing-items/print/', views.report_missing_items_print, name='report_missing_items_print'),
	path('reports/annual-physical-inventory/', views.report_annual_physical_inventory, name='report_annual_physical_inventory'),
	path('reports/annual-physical-inventory/print/', views.report_annual_physical_inventory_print, name='report_annual_physical_inventory_print'),
]
