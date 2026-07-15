from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('residents/', views.residents_list, name='residents_list'),
    path('reports/today-visitors/', views.today_visitors_report, name='today_visitors_report'),
    path('reports/households/', views.household_report, name='household_report'),
    path('reports/senior-citizens/', views.senior_citizens_report, name='senior_citizens_report'),
    path('reports/businesses/', views.businesses_report, name='businesses_report'),
    path('reports/4ps/', views.fourps_report, name='fourps_report'),
    path('reports/pregnancy/', views.pregnancy_report, name='pregnancy_report'),
]