from django.urls import path
from django.views.generic import RedirectView

app_name = 'bhw_reports'

urlpatterns = [
    # Keep /reports/ active by pointing to existing report entry points.
    path('', RedirectView.as_view(pattern_name='residents:reports_home', permanent=False), name='index'),
    path('residents/', RedirectView.as_view(pattern_name='residents:reports_home', permanent=False), name='residents_reports_home'),
]