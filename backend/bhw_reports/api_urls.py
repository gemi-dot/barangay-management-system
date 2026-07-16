from django.urls import path

from . import views_api

app_name = "bhw_reports_api"

urlpatterns = [
    path("summary/", views_api.bhw_reports_summary_api, name="summary"),
    path("senior-citizens/", views_api.bhw_senior_citizens_api, name="senior_citizens"),
    path("fourps/", views_api.bhw_fourps_api, name="fourps"),
    path("pregnancy/", views_api.bhw_pregnancy_api, name="pregnancy"),
    path("health/", views_api.bhw_health_api, name="health"),
]
