from django.urls import path

from . import views_api

app_name = "dashboard_api"

urlpatterns = [
    path(
        "summary/",
        views_api.dashboard_summary_api,
        name="summary",
    ),
]
