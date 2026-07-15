from django.core.management.base import BaseCommand
from inventory.sample_data import load_inventory_sample_entries


class Command(BaseCommand):
    help = 'Create or update standard inventory sample entries.'

    def handle(self, *args, **options):
        result = load_inventory_sample_entries()

        for item in result['details']:
            if item['created']:
                self.stdout.write(self.style.SUCCESS(f"CREATED: {item['property_number']}"))
            else:
                self.stdout.write(self.style.WARNING(f"UPDATED: {item['property_number']}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created: {result['created']} | Updated: {result['updated']} | Total: {result['total']}"
            )
        )
