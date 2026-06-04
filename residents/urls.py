from django.urls import path
from . import views

app_name = 'residents'

urlpatterns = [
    # Add resident-specific URLs here as needed
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

    
]