"""
URL configuration for barangay_ims project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('resident/', include('residents.portal_urls')),
    path('api/dashboard/', include('dashboard.api_urls')),
    path('api/reports/', include('dashboard.reports_api_urls')),
    path('api/', include('residents.api_urls')),
    path('api/portal/', include('residents.portal_api_urls')),
    path('api/households/', include('residents.household_api_urls')),
    path('api/inventory/', include('inventory.api_urls')),
    path('api/bhw-reports/', include('bhw_reports.api_urls')),
    path('', include('dashboard.urls')),
    path('residents/', include('residents.urls')),
    path('reports/', include('bhw_reports.urls')),
    path('assistant/', include('assistant.urls')),
    path('inventory/', include('inventory.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
