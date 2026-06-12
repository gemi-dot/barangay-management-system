from django.urls import path
from . import views

app_name = 'residents'

urlpatterns = [
    # Add resident-specific URLs here as needed
    path('scan/diagnostic/', views.qr_diagnostic, name='qr_diagnostic'),
    path('scan/input/', views.scan_qr_input, name='scan_qr_input'),
    path('scan/test/', views.scan_test_page, name='scan_test_page'),
    path('scan/<str:qr_value>/', views.scan_resident_qr, name='scan_resident_qr'),
    path('quick-view/<int:resident_id>/', views.resident_quick_view, name='resident_quick_view'),
    path('quick-view/<int:resident_id>/service-log/', views.resident_service_log_action, name='resident_service_log_action'),
    path('quick-view/<int:resident_id>/create-document-request/', views.quick_create_document_request, name='quick_create_document_request'),
    path('reports/', views.reports_home, name='reports_home'),
    path('voters-report/', views.voters_report, name='voters_report'),
    path('voters-by-precinct/', views.voters_by_precinct_report, name='voters_by_precinct'),
    path('dashboard/voters-by-precinct/', views.voters_precinct_dashboard, name='voters_precinct_dashboard'),
    path('request-document/', views.request_document, name='request_document'),
    path('request-document/success/', views.document_request_success, name='document_request_success'),
    path('track-request/', views.track_document_request, name='track_document_request'),
    path('document-requests/', views.document_requests_queue, name='document_requests_queue'),
    path('document-requests/<int:request_id>/update/', views.update_document_request_status, name='update_document_request_status'),
    path('document-requests/reset-test-data/', views.reset_document_request_test_data, name='reset_document_request_test_data'),
    path('documents/certificate-of-residency/sample/', views.certificate_of_residency_sample, name='certificate_of_residency_sample'),
    path('documents/certificate-of-residency/sample/<int:request_id>/', views.certificate_of_residency_sample, name='certificate_of_residency_sample_for_request'),
    path('documents/certificate-of-indigency/sample/', views.certificate_of_indigency_sample, name='certificate_of_indigency_sample'),
    path('documents/certificate-of-indigency/sample/<int:request_id>/', views.certificate_of_indigency_sample, name='certificate_of_indigency_sample_for_request'),
    path('documents/barangay-clearance/sample/', views.barangay_clearance_sample, name='barangay_clearance_sample'),
    path('documents/barangay-clearance/sample/<int:request_id>/', views.barangay_clearance_sample, name='barangay_clearance_sample_for_request'),
    path('documents/business-clearance/sample/', views.business_clearance_sample, name='business_clearance_sample'),
    path('documents/business-clearance/sample/<int:request_id>/', views.business_clearance_sample, name='business_clearance_sample_for_request'),
    path('documents/barangay-id/sample/', views.barangay_id_sample, name='barangay_id_sample'),
    path('documents/barangay-id/sample/<int:resident_id>/', views.barangay_id_sample, name='barangay_id_sample_for_resident'),
    path('documents/barangay-id/bulk-print/', views.barangay_id_bulk_print, name='barangay_id_bulk_print'),
    path('documents/sop/qr-frontdesk/', views.qr_frontdesk_sop_sheet, name='qr_frontdesk_sop_sheet'),

    
]