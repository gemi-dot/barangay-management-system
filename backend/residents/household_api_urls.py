from django.urls import path

from . import views_household_api

app_name = "households_api"

urlpatterns = [
    path("", views_household_api.HouseholdListCreateAPIView.as_view(), name="household-list-create"),
    path("summary", views_household_api.households_summary_api, name="summary-no-slash"),
    path("summary/", views_household_api.households_summary_api, name="summary"),
    path("list", views_household_api.households_list_api, name="list-no-slash"),
    path("list/", views_household_api.households_list_api, name="list"),
    path("<int:pk>", views_household_api.HouseholdDetailAPIView.as_view(), name="detail-no-slash"),
    path("<int:pk>/", views_household_api.HouseholdDetailAPIView.as_view(), name="detail"),
    path("<int:pk>/archive", views_household_api.HouseholdArchiveAPIView.as_view(), name="archive-no-slash"),
    path("<int:pk>/archive/", views_household_api.HouseholdArchiveAPIView.as_view(), name="archive"),
    path("<int:pk>/members", views_household_api.HouseholdMemberAddAPIView.as_view(), name="add-member-no-slash"),
    path("<int:pk>/members/", views_household_api.HouseholdMemberAddAPIView.as_view(), name="add-member"),
    path(
        "<int:pk>/members/<int:resident_id>",
        views_household_api.HouseholdMemberRemoveAPIView.as_view(),
        name="remove-member-no-slash",
    ),
    path(
        "<int:pk>/members/<int:resident_id>/",
        views_household_api.HouseholdMemberRemoveAPIView.as_view(),
        name="remove-member",
    ),
    path("<int:pk>/change-head", views_household_api.HouseholdChangeHeadAPIView.as_view(), name="change-head-no-slash"),
    path("<int:pk>/change-head/", views_household_api.HouseholdChangeHeadAPIView.as_view(), name="change-head"),
    path("<int:pk>/statistics", views_household_api.HouseholdStatisticsAPIView.as_view(), name="statistics-no-slash"),
    path("<int:pk>/statistics/", views_household_api.HouseholdStatisticsAPIView.as_view(), name="statistics"),
]
