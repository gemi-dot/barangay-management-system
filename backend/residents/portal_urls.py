from django.urls import path
from . import views

app_name = 'resident_portal'

urlpatterns = [
    path('login/', views.resident_login, name='login'),
    path('register/', views.resident_register, name='register'),
    path('logout/', views.resident_logout, name='logout'),
    path('dashboard/', views.resident_dashboard, name='dashboard'),
    path('profile/', views.resident_profile, name='profile'),
    path('requests/', views.resident_requests, name='requests'),
    path('requests/new/', views.resident_request_new, name='request_new'),
    path('announcements/', views.resident_announcements, name='announcements'),
]
