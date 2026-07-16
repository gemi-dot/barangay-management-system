from django.urls import path

from . import views_portal_api

app_name = "resident_portal_api"

urlpatterns = [
    path("register/", views_portal_api.portal_register_api, name="register"),
    path("dashboard/", views_portal_api.portal_dashboard_api, name="dashboard"),
    path("requests/", views_portal_api.portal_requests_api, name="requests"),
    path("requests/create/", views_portal_api.portal_request_create_api, name="request_create"),
]
