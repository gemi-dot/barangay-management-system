from django.core.management.base import BaseCommand
from inventory.audit_utils import build_inventory_legacy_audit


class Command(BaseCommand):
    help = (
        'Print a summary of unmatched legacy inventory values for Category.name, '
        'Asset.location, and Asset.condition.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum rows per section (default: 50).',
        )

    def handle(self, *args, **options):
        limit = max(1, options['limit'])
        audit = build_inventory_legacy_audit(limit=limit)

        self.stdout.write(self.style.SUCCESS('Inventory Legacy Value Audit'))
        self.stdout.write('-' * 72)

        for section in audit['sections']:
            self._print_section(section)

        self.stdout.write('-' * 72)
        self.stdout.write('Done. If any unmatched values are listed, clean them manually in admin or SQL.')

    def _print_section(self, section):
        self.stdout.write(f"\n{section['title']}")
        if not section['rows'] and section['unmatched_count'] == 0:
            self.stdout.write(self.style.SUCCESS('  No unmatched values found.'))
            return

        self.stdout.write(self.style.WARNING(f"  Found {section['unmatched_count']} unmatched distinct value(s)."))
        self.stdout.write('  Value | Count | Suggested standardized value')

        for item in section['rows']:
            self.stdout.write(f"  {item['value']} | {item['count']} | {item['suggestion']}")

        if section['remaining_count'] > 0:
            self.stdout.write(f"  ... and {section['remaining_count']} more. Use --limit to show more rows.")
