import json
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid
import os
from django.db.models import Sum
from datetime import datetime, timedelta
from collections import defaultdict
from django.utils.timezone import now

class Category(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    placeholder_image = models.CharField(max_length=500, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories', null=True)
    is_public = models.BooleanField(default=True)
    is_wishlist = models.BooleanField(default=False)  # Add this!
    # Add tags as a JSON string to be compatible with any database
    tags = models.TextField(blank=True, null=True)
    
    def set_tags(self, tags_list):
        if tags_list is None:
            tags_list = []
        self.tags = json.dumps(tags_list)
        
    def get_tags(self):
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except:
            print(f"Error parsing tags: {self.tags}")
            return []

class Image(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    path = models.CharField(max_length=500)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='images')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Add new fields
    description = models.TextField(blank=True, null=True)
    valuation = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tags = models.TextField(blank=True, null=True)
    purchase_url = models.URLField(blank=True, null=True)
    is_wishlist = models.BooleanField(default=False)
    
    def set_tags(self, tags_list):
        self.tags = json.dumps(tags_list)
        
    def get_tags(self):
        if self.tags:
            return json.loads(self.tags)
        return []
    
class UserFollow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('follower', 'followed')  # Prevent duplicate follows
        
    def __str__(self):
        return f"{self.follower.username} follows {self.followed.username}"
    
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True)
    display_name = models.CharField(max_length=100, blank=True)
    profile_picture = models.CharField(max_length=500, blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"

class FinancialInfo(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='financial_info')

    def get_total_spending(self):
        return Image.objects.filter(
            category__user=self.user, category__is_wishlist=False, is_wishlist=False
        ).aggregate(total_spending=Sum('valuation'))['total_spending'] or 0

    def get_collection_prices(self):
        categories = Category.objects.filter(user=self.user, is_wishlist=False).prefetch_related('images')
        return [{"collectionName": category.name, "price": sum(image.valuation for image in category.images.all() if image.valuation)} for category in categories]

    def get_monthly_spending(self):
        # Use timezone-aware datetime
        twelve_months_ago = now() - timedelta(days=365)
        monthly_spending = defaultdict(float)

        # Query the Image model directly, using uploaded_at
        images = Image.objects.filter(
            category__user=self.user,
            category__is_wishlist=False,
            is_wishlist=False,
            uploaded_at__gte=twelve_months_ago  # Use uploaded_at for date filtering
        )

        for image in images:
            if image.valuation:  # Ensure valuation exists
                # Convert uploaded_at to a naive datetime if necessary, or use it directly
                month_key = image.uploaded_at.strftime('%Y-%m')  # Format as "YYYY-MM"
                monthly_spending[month_key] += float(image.valuation)

        # Convert to a sorted list of dictionaries
        return [{"month": key, "amount": value} for key, value in sorted(monthly_spending.items())]

class ProfileStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile_stats')

    def get_total_value(self):
        return Image.objects.filter(
            category__user=self.user, category__is_wishlist=False, is_wishlist=False
        ).aggregate(total_value=Sum('valuation'))['total_value'] or 0

    def get_total_collections(self):
        return Category.objects.filter(user=self.user, is_wishlist=False).count()

    def get_total_items(self):
        return Image.objects.filter(
            category__user=self.user, category__is_wishlist=False, is_wishlist=False
        ).count()
    
class Goal(models.Model):
    user_profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='goals',
        default=0
    )
    monthly_spending = models.DecimalField(max_digits=10, decimal_places=2)
    spending_cushion = models.BooleanField(default=False)
    cushion_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Goal for {self.user_profile.user.username} - ${self.monthly_spending}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

@receiver(post_save, sender=User)
def create_financial_info(sender, instance, created, **kwargs):
    if created:
        FinancialInfo.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_financial_info(sender, instance, **kwargs):
    if hasattr(instance, 'financial_info'):
        instance.financial_info.save()