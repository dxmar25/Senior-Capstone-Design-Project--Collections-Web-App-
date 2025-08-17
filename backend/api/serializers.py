import json
from rest_framework import serializers
from .utils import generate_presigned_url
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import (
    Category,
    Image,
    UserFollow,
    Goal
)

class ImageSerializer(serializers.ModelSerializer):
    presigned_url = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = ['id', 'title', 'path', 'presigned_url', 'category', 'uploaded_at', 
                 'description', 'valuation', 'tags', 'purchase_url', 'is_wishlist']
        read_only_fields = ['id', 'uploaded_at']
    
    def get_presigned_url(self, obj):
        # Your existing code
        path = obj.path
        if '/' in path and 's3.amazonaws.com/' in path:
            object_key = path.split('s3.amazonaws.com/')[1]
        else:
            object_key = path
            
        return generate_presigned_url(obj.path)
    
    def get_tags(self, obj):
        return obj.get_tags() if obj.tags else []
    
    def to_internal_value(self, data):
        internal_value = super().to_internal_value(data)
        tags = data.get('tags', [])
        if tags and isinstance(tags, list):
            internal_value['tags'] = json.dumps(tags)
        return internal_value

class CategorySerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    placeholder_presigned_url = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at', 'placeholder_image', 'placeholder_presigned_url', 
                 'images', 'is_public', 'tags']
        read_only_fields = ['id', 'created_at']
    
    def get_placeholder_presigned_url(self, obj):
        # Your existing code
        if not obj.placeholder_image:
            return None
            
        placeholder = obj.placeholder_image
        if '/' in placeholder and 's3.amazonaws.com/' in placeholder:
            object_key = placeholder.split('s3.amazonaws.com/')[1]
        else:
            object_key = placeholder
            
        return generate_presigned_url(object_key)
    
    def get_tags(self, obj):
        return obj.get_tags() if obj.tags else []
        
    def to_internal_value(self, data):
        internal_value = super().to_internal_value(data)
        tags = data.get('tags', [])
        if tags and isinstance(tags, list):
            internal_value['tags'] = json.dumps(tags)
        return internal_value

class CategoryCreateSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'placeholder_image', 'is_public', 'tags']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        category = Category.objects.create(**validated_data)
        if tags:
            category.set_tags(tags)
            category.save()
        return category

class ImageUploadSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    file = serializers.ImageField()
    description = serializers.CharField(required=False, allow_blank=True)
    valuation = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)

    def create(self, validated_data):
        return validated_data
        
    def validate(self, data):
        print("DEBUG: ImageUploadSerializer validation")
        print("DEBUG: Data received:", data)
        if 'title' not in data:
            raise serializers.ValidationError({"title": "Title is required"})
        if 'category' not in data:
            raise serializers.ValidationError({"category": "Category is required"})
        if 'file' not in data:
            raise serializers.ValidationError({"file": "Image file is required"})
        return data
    
# Replace your UserProfileSerializer in api/serializers.py with this version
class UserProfileSerializer(serializers.ModelSerializer):
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    categories = CategorySerializer(many=True, read_only=True)

    bio = serializers.CharField(source='profile.bio', allow_blank=True, required=False)
    display_name = serializers.CharField(source='profile.display_name', allow_blank=True, required=False)
    profile_picture = serializers.CharField(source='profile.profile_picture', allow_null=True, required=False)
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'follower_count', 'following_count', 'is_following', 'categories',
                 'bio', 'display_name', 'profile_picture', 'profile_picture_url']
    
    def get_follower_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.followers.filter(follower=request.user).exists()
        return False
        
    def get_profile_picture_url(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile and obj.profile.profile_picture:
                from .utils import generate_presigned_url
                return generate_presigned_url(obj.profile.profile_picture)
            return None
        except Exception as e:
            print(f"Error getting profile picture URL: {str(e)}")
            return None
    
    def update(self, instance, validated_data):
        # Extract profile data
        profile_data = {}
        if 'profile' in validated_data:
            profile_data = validated_data.pop('profile')
        
        print(f"Update method called for user: {instance.username}")
        print(f"Profile data: {profile_data}")
        print(f"Main data: {validated_data}")
        
        # Update User model fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Profile model fields
        if profile_data:
            try:
                if hasattr(instance, 'profile'):
                    profile = instance.profile
                else:
                    # Create profile if it doesn't exist
                    from api.models import UserProfile
                    profile = UserProfile.objects.create(user=instance)
                    print(f"Created profile for user {instance.username}")
                
                # Update profile fields
                for attr, value in profile_data.items():
                    setattr(profile, attr, value)
                
                profile.save()
                print(f"Profile saved: bio='{profile.bio}', display_name='{profile.display_name}'")
            except Exception as e:
                print(f"Error updating profile: {str(e)}")
                import traceback
                traceback.print_exc()
        
        return instance

class UserFollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFollow
        fields = ['id', 'follower', 'followed', 'created_at']
        read_only_fields = ['id', 'created_at']

class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = ['id', 'monthly_spending', 'spending_cushion', 'cushion_amount', 'created_at']
