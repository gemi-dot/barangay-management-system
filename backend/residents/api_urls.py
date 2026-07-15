from django.urls import path
from rest_framework.routers import DefaultRouter

from .views_api import DashboardSummaryAPIView, ResidentViewSet

router = DefaultRouter()
router.register("residents", ResidentViewSet)

urlpatterns = [
	path('dashboard/summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
] + router.urls
