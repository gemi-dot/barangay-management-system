from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import pagination, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.roles import user_has_office_role

from .household_serializers import (
    HouseholdDetailSerializer,
    HouseholdListSerializer,
    HouseholdMemberSerializer,
    HouseholdUpdateSerializer,
    HouseholdWriteSerializer,
    household_statistics,
)
from .household_services import (
    add_household_member,
    change_household_head,
    remove_household_member,
)
from .models import Household, HouseholdMembership, Resident


class HouseholdStaffPermission(BasePermission):
    def has_permission(self, request, view):
        return user_has_office_role(request.user)


class HouseholdPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def household_queryset():
    return Household.objects.select_related('household_head').prefetch_related(
        'memberships__resident'
    )


class HouseholdListCreateAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def get(self, request):
        households = household_queryset().order_by('household_number')
        query = request.query_params.get('q', '').strip()
        purok = (request.query_params.get('purok') or request.query_params.get('zone') or '').strip()
        household_status = request.query_params.get('status', '').strip()

        if purok:
            households = households.filter(purok=purok)
        if household_status:
            households = households.filter(status=household_status)
        if query:
            households = households.filter(
                Q(household_number__icontains=query)
                | Q(household_head__first_name__icontains=query)
                | Q(household_head__middle_name__icontains=query)
                | Q(household_head__last_name__icontains=query)
                | Q(memberships__resident__first_name__icontains=query)
                | Q(memberships__resident__middle_name__icontains=query)
                | Q(memberships__resident__last_name__icontains=query)
                | Q(complete_address__icontains=query)
                | Q(purok__icontains=query)
                | Q(status__icontains=query)
            ).distinct()

        paginator = HouseholdPagination()
        page = paginator.paginate_queryset(households, request)
        serializer = HouseholdListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = HouseholdWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        household = serializer.save()
        return Response(
            HouseholdDetailSerializer(household, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class HouseholdSummaryAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def get(self, request):
        households = Household.objects.all()
        by_purok = households.values('purok').annotate(total=Count('id')).order_by('purok')
        return Response(
            {
                'total_households': households.count(),
                'total_residents': Resident.objects.filter(is_active=True).count(),
                'by_zone': [
                    {'zone': row['purok'] or 'Unassigned', 'total': row['total']}
                    for row in by_purok
                ],
            }
        )


class HouseholdDetailAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def get_object(self, pk):
        return get_object_or_404(household_queryset(), pk=pk)

    def get(self, request, pk):
        return Response(HouseholdDetailSerializer(self.get_object(pk), context={'request': request}).data)

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        household = self.get_object(pk)
        serializer = HouseholdUpdateSerializer(
            household,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        household = serializer.save()
        household.refresh_from_db()
        return Response(HouseholdDetailSerializer(household, context={'request': request}).data)


class HouseholdArchiveAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def post(self, request, pk):
        household = get_object_or_404(Household, pk=pk)
        requested_status = request.data.get('status', Household.Status.ARCHIVED)
        allowed_statuses = {Household.Status.INACTIVE, Household.Status.ARCHIVED}
        if requested_status not in allowed_statuses:
            return Response(
                {'status': 'Archive/deactivate status must be inactive or archived.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        household.status = requested_status
        household.save(update_fields=['status', 'updated_at'])
        return Response(HouseholdDetailSerializer(household, context={'request': request}).data)


class HouseholdMemberAddAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def post(self, request, pk):
        household = get_object_or_404(Household, pk=pk)
        resident = get_object_or_404(Resident, pk=request.data.get('resident_id'))
        relationship = request.data.get('relationship_to_head', '').strip()
        valid_relationships = {value for value, _ in HouseholdMembership.Relationship.choices}
        if relationship not in valid_relationships or relationship == HouseholdMembership.Relationship.HEAD:
            return Response(
                {'relationship_to_head': 'Select a valid non-head relationship.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            membership = add_household_member(
                household=household,
                resident=resident,
                relationship_to_head=relationship,
                move=bool(request.data.get('move', False)),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            HouseholdMemberSerializer(membership, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class HouseholdMemberRemoveAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def delete(self, request, pk, resident_id):
        household = get_object_or_404(Household, pk=pk)
        resident = get_object_or_404(Resident, pk=resident_id)
        try:
            remove_household_member(household=household, resident=resident)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class HouseholdChangeHeadAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def post(self, request, pk):
        household = get_object_or_404(Household, pk=pk)
        new_head = get_object_or_404(Resident, pk=request.data.get('resident_id'))
        previous_relationship = request.data.get(
            'previous_head_relationship', HouseholdMembership.Relationship.OTHER_RELATIVE
        ).strip()
        valid_relationships = {value for value, _ in HouseholdMembership.Relationship.choices}
        if previous_relationship not in valid_relationships or previous_relationship == HouseholdMembership.Relationship.HEAD:
            return Response(
                {'previous_head_relationship': 'Select a valid non-head relationship.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            household = change_household_head(
                household=household,
                new_head=new_head,
                previous_head_relationship=previous_relationship,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        return Response(HouseholdDetailSerializer(household, context={'request': request}).data)


class HouseholdStatisticsAPIView(APIView):
    permission_classes = [HouseholdStaffPermission]

    def get(self, request, pk):
        household = get_object_or_404(household_queryset(), pk=pk)
        return Response(household_statistics(household))


households_list_api = HouseholdListCreateAPIView.as_view()
households_summary_api = HouseholdSummaryAPIView.as_view()
