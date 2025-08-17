# Create file: backend/api/management/commands/create_missing_profiles.py

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile

class Command(BaseCommand):
    help = 'Creates UserProfile objects for users that dont have one'

    def handle(self, *args, **options):
        users_without_profile = []
        for user in User.objects.all():
            try:
                # Try to access the profile
                user.profile
            except User.profile.RelatedObjectDoesNotExist:
                # If profile doesn't exist, create it
                UserProfile.objects.create(user=user)
                users_without_profile.append(user.username)
        
        if users_without_profile:
            self.stdout.write(self.style.SUCCESS(
                f'Created profiles for {len(users_without_profile)} users: {", ".join(users_without_profile)}'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('All users already have profiles'))