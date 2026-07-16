from django.urls import path
from rest_framework.routers import DefaultRouter

from .views_api import (
	DashboardSummaryAPIView,
	DocumentRequestTrackAPIView,
	DocumentRequestViewSet,
	OfficeProfileAPIView,
	QuickBirthdayCorrectionAPIView,
	QuickGenderCorrectionAPIView,
	QrResolveAPIView,
	ResidentViewSet,
)

router = DefaultRouter()
router.register("residents", ResidentViewSet)
router.register("document-requests", DocumentRequestViewSet, basename="document-requests")

urlpatterns = [
	path('dashboard/summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
	path('document-requests/track/', DocumentRequestTrackAPIView.as_view(), name='document-request-track'),
	path('office-profile/', OfficeProfileAPIView.as_view(), name='office-profile'),
	path('qr/resolve/', QrResolveAPIView.as_view(), name='qr-resolve'),
	path('quick-tools/gender-correction/', QuickGenderCorrectionAPIView.as_view(), name='quick-gender-correction'),
	path('quick-tools/birthday-correction/', QuickBirthdayCorrectionAPIView.as_view(), name='quick-birthday-correction'),
] + router.urls
