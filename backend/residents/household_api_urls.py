from django.urls import path

from . import views_household_api

app_name = "households_api"

urlpatterns = [
    path("summary/", views_household_api.households_summary_api, name="summary"),
    path("list/", views_household_api.households_list_api, name="list"),
]
