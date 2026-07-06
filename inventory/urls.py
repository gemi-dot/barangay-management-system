from django.urls import path

from . import views

app_name = 'inventory'

urlpatterns = [
	path('', views.index, name='index'),
	path('samples/load/', views.load_sample_entries, name='load_sample_entries'),
	path('audit/legacy-values/', views.legacy_values_audit, name='legacy_values_audit'),
	path('items/', views.item_list, name='item_list'),
	path('items/<int:asset_id>/mark-damaged/', views.asset_mark_damaged, name='asset_mark_damaged'),
	path('items/<int:asset_id>/mark-missing/', views.asset_mark_missing, name='asset_mark_missing'),
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
