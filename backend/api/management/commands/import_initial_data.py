import json
import os
from django.core.management.base import BaseCommand
from api.models import Category, Image

class Command(BaseCommand):
    help = 'Import initial data from JSON file'

    def handle(self, *args, **options):
        # The path to your React app's data.json file
        json_file_path = '../src/data/data.json'
        
        if not os.path.exists(json_file_path):
            self.stdout.write(self.style.ERROR(f'File does not exist: {json_file_path}'))
            return
        
        try:
            with open(json_file_path, 'r') as f:
                data = json.load(f)
            
            # Process each category
            for category_data in data.get('categories', []):
                # Create or get category
                category, created = Category.objects.get_or_create(
                    name=category_data['name'],
                    defaults={
                        'placeholder_image': category_data.get('placeholder', '')
                    }
                )
                
                action = 'Created' if created else 'Updated'
                self.stdout.write(self.style.SUCCESS(f'{action} category: {category.name}'))
                
                # Process images for this category
                for image_data in category_data.get('images', []):
                    # Skip if image with same title and path already exists
                    if not Image.objects.filter(
                        title=image_data['title'],
                        path=image_data['path'],
                        category=category
                    ).exists():
                        Image.objects.create(
                            title=image_data['title'],
                            path=image_data['path'],
                            category=category
                        )
                        self.stdout.write(self.style.SUCCESS(f'  Created image: {image_data["title"]}'))
            
            self.stdout.write(self.style.SUCCESS('Data import completed successfully!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing data: {str(e)}'))