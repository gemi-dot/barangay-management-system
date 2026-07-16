from django.urls import path

from . import views_api

app_name = "dashboard_reports_api"

urlpatterns = [
    path("today-visitors/", views_api.reports_today_visitors_api, name="today_visitors"),
    path("senior-citizens/", views_api.reports_senior_citizens_api, name="senior_citizens"),
    path("businesses/", views_api.reports_businesses_api, name="businesses"),
    path("fourps/", views_api.reports_fourps_api, name="fourps"),
    path("pregnancy/", views_api.reports_pregnancy_api, name="pregnancy"),
]
