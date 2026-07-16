from django.urls import path

from . import views_api

app_name = "inventory_api"

urlpatterns = [
    path("summary/", views_api.inventory_summary_api, name="summary"),
    path("assets/", views_api.inventory_assets_api, name="assets"),
]
