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

class SlashOptionalDefaultRouter(DefaultRouter):
	trailing_slash = '/?'


router = SlashOptionalDefaultRouter()
router.register("residents", ResidentViewSet)
router.register("document-requests", DocumentRequestViewSet, basename="document-requests")

urlpatterns = [
	path('residents', ResidentViewSet.as_view({'get': 'list', 'post': 'create'}), name='resident-list-no-slash'),
	path('document-requests', DocumentRequestViewSet.as_view({'get': 'list'}), name='document-request-list-no-slash'),
	path('dashboard/summary', DashboardSummaryAPIView.as_view(), name='dashboard-summary-no-slash'),
	path('dashboard/summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
	path('document-requests/track', DocumentRequestTrackAPIView.as_view(), name='document-request-track-no-slash'),
	path('document-requests/track/', DocumentRequestTrackAPIView.as_view(), name='document-request-track'),
	path('office-profile', OfficeProfileAPIView.as_view(), name='office-profile-no-slash'),
	path('office-profile/', OfficeProfileAPIView.as_view(), name='office-profile'),
	path('qr/resolve', QrResolveAPIView.as_view(), name='qr-resolve-no-slash'),
	path('qr/resolve/', QrResolveAPIView.as_view(), name='qr-resolve'),
	path('quick-tools/gender-correction', QuickGenderCorrectionAPIView.as_view(), name='quick-gender-correction-no-slash'),
	path('quick-tools/gender-correction/', QuickGenderCorrectionAPIView.as_view(), name='quick-gender-correction'),
	path('quick-tools/birthday-correction', QuickBirthdayCorrectionAPIView.as_view(), name='quick-birthday-correction-no-slash'),
	path('quick-tools/birthday-correction/', QuickBirthdayCorrectionAPIView.as_view(), name='quick-birthday-correction'),
] + router.urls
