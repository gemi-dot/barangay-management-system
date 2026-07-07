from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from inventory.models import Asset


class Command(BaseCommand):
    help = (
        'Normalize legacy inventory property numbers (ABG-/INV-) '
        'to sequential LA-#### values.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply changes. Without this flag, command runs in dry-run mode.',
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']
        target_assets = list(
            Asset.objects.filter(
                Q(property_number__istartswith='ABG-') | Q(property_number__istartswith='INV-')
            ).order_by('created_at', 'id')
        )

        if not target_assets:
            self.stdout.write(self.style.SUCCESS('No ABG-/INV- property numbers found to normalize.'))
            return

        existing_la_codes = set(
            Asset.objects.filter(property_number__regex=r'^LA-\d{4}$').values_list('property_number', flat=True)
        )
        current_max = self._max_la_sequence(existing_la_codes)

        mapping = []
        next_sequence = current_max
        for asset in target_assets:
            next_sequence = self._next_available_sequence(next_sequence, existing_la_codes)
            if next_sequence > 9999:
                raise CommandError('Cannot assign LA code beyond LA-9999.')

            new_code = f'LA-{next_sequence:04d}'
            mapping.append((asset, new_code))
            existing_la_codes.add(new_code)

        self.stdout.write(self.style.SUCCESS('Inventory Property Number Normalization Plan'))
        self.stdout.write('-' * 72)
        for asset, new_code in mapping:
            self.stdout.write(f'{asset.property_number} -> {new_code}')
        self.stdout.write('-' * 72)

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN ONLY. Planned updates: {len(mapping)}. Re-run with --apply to commit changes.'
                )
            )
            return

        with transaction.atomic():
            for asset, new_code in mapping:
                asset.property_number = new_code
                asset.save(update_fields=['property_number'])

        self.stdout.write(self.style.SUCCESS(f'Done. Updated {len(mapping)} asset(s).'))

    def _max_la_sequence(self, la_codes):
        max_sequence = 0
        for code in la_codes:
            try:
                sequence = int(code.split('-', 1)[1])
            except (IndexError, ValueError):
                continue
            if sequence > max_sequence:
                max_sequence = sequence
        return max_sequence

    def _next_available_sequence(self, sequence, existing_la_codes):
        candidate = sequence
        while True:
            candidate += 1
            if f'LA-{candidate:04d}' not in existing_la_codes:
                return candidate
