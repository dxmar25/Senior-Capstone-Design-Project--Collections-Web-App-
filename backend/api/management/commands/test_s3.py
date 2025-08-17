from django.core.management.base import BaseCommand
from pathlib import Path
from api.utils import upload_file_to_s3
import io

class Command(BaseCommand):
    help = 'Test S3 upload'

    def handle(self, *args, **options):
        # Path to a test image file
        test_file_path = Path("test_image.jpg")
        
        if not test_file_path.exists():
            self.stdout.write(self.style.ERROR(f'Test file not found: {test_file_path}'))
            return
            
        # Read the file data
        with open(test_file_path, 'rb') as original_file:
            file_data = original_file.read()
        
        # Create a file-like object with the data
        file_obj = io.BytesIO(file_data)
        file_obj.name = test_file_path.name
        file_obj.content_type = 'image/jpeg'
        
        # Upload to S3
        s3_path = upload_file_to_s3(file_obj, 'test')
            
        if s3_path:
            self.stdout.write(self.style.SUCCESS(f'Successfully uploaded to S3: {s3_path}'))
        else:
            self.stdout.write(self.style.ERROR('Failed to upload to S3'))