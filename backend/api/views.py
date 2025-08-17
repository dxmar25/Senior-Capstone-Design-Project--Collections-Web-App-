# backend/api/views.py
import json
from django.http import JsonResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.db import models
from django.conf import settings
from .utils import get_s3_client, delete_s3_file, delete_s3_folder, upload_file_to_s3
import google.generativeai as genai
import re

from django.views.decorators.csrf import csrf_exempt #SUSPICIOUS AF CODE BONNIE DELETE
from .models import Category, Image
from .serializers import (
    UserProfileSerializer,
    UserFollowSerializer,
    CategorySerializer, 
    CategoryCreateSerializer,
    ImageSerializer, 
    ImageUploadSerializer,
    GoalSerializer
)
from .models import (
    UserFollow,
    UserProfile,
    Category,
    Image,
    ProfileStats,
    Goal,
    FinancialInfo
)
from .utils import get_s3_client, delete_s3_file, delete_s3_folder, upload_file_to_s3
# from .gemini import generate_ai_fields
import os
import requests

@api_view(['GET'])
@permission_classes([AllowAny])
def test_cors(request):
    return JsonResponse({"message": "CORS is working!"})

@api_view(['GET'])
def test_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True, 
            'user_id': request.user.id,
            'username': request.user.username
        })
    else:
        return JsonResponse({'authenticated': False}, status=401)

class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # Or appropriate permission
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CategoryCreateSerializer
        return CategorySerializer
    
    def perform_create(self, serializer):
        # Associate with user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_with_image(self, request):
        """Create a category with a placeholder image."""
        name = request.data.get('name')
        print("upload_with_image function got called")
        print("DEBUG: User authenticated:", request.user.is_authenticated)
        print("DEBUG: User ID:", request.user.id if request.user.is_authenticated else None)
        print("DEBUG: Request data:", request.data)
        
        if not name:
            return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the file from request
        placeholder_image = request.FILES.get('placeholder_image')
        s3_path = None
        
        if placeholder_image:
            # Upload the image to S3 with user_id
            s3_path = upload_file_to_s3(
                placeholder_image, 
                'category_placeholders', 
                request.user.id
            )
            
            if not s3_path:
                return Response(
                    {'error': 'Failed to upload placeholder image'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Create the category
        category = Category.objects.create(
            name=name,
            placeholder_image=s3_path,
            user=request.user,
            is_public=request.data.get('is_public', True)
        )
        
        # Process tags if present
        if 'tags' in request.data:
            try:
                tags_data = request.data.get('tags')
                
                # If tags comes as a string (stringified JSON), parse it
                if isinstance(tags_data, str):
                    import json
                    try:
                        tags = json.loads(tags_data)
                        if isinstance(tags, list):
                            category.set_tags(tags)
                            category.save()
                            print(f"DEBUG: Tags saved: {tags}")
                    except json.JSONDecodeError:
                        print("DEBUG: Error parsing tags JSON")
                elif isinstance(tags_data, list):
                    category.set_tags(tags_data)
                    category.save()
                    print(f"DEBUG: Tags saved: {tags_data}")
            except Exception as e:
                print(f"DEBUG: Error processing tags: {str(e)}")
        
        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # @permission_classes([AllowAny])  
    def get_queryset(self):
        # Always filter by the current user
        if self.request.user.is_authenticated:
            return Category.objects.filter(user=self.request.user)
        return Category.objects.none()
    
    # @permission_classes([AllowAny])  
    def perform_create(self, serializer):
        # Always associate with the current user
        serializer.save(user=self.request.user)

    # In the upload_image and other functions, add user filtering
    # @permission_classes([AllowAny])  
    def upload_image(request):
        # Add this at the beginning:
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=True, methods=['patch'])
    def toggle_visibility(self, request, pk=None):
        """Toggle the visibility of a category (public/private)"""
        try:
            category = self.get_object()
            
            # Check if the category belongs to the user
            if category.user != request.user:
                return Response(
                    {'error': 'You do not have permission to modify this collection'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Toggle visibility
            category.is_public = not category.is_public
            category.save()
            
            return Response({
                'id': category.id,
                'name': category.name,
                'is_public': category.is_public
            })
            
        except Exception as e:
            print(f"Error toggling category visibility: {str(e)}")
            return Response(
                {'error': 'Failed to update collection visibility'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_destroy(self, instance):
        """Override to clean up S3 resources before deleting the category"""
        try:
            # Delete the placeholder image if exists
            if instance.placeholder_image:
                delete_s3_file(instance.placeholder_image)
                
            # Delete all images in the category from S3
            folder_name = instance.name
            user_id = instance.user.id if instance.user else None
            delete_count = delete_s3_folder(folder_name, user_id)
            print(f"Deleted {delete_count} files from S3 folder: {folder_name}")
                
            # Delete the category (will cascade to images in DB)
            instance.delete()
            
            # Send WebSocket update
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'collection_{instance.id}',
                    {
                        'type': 'collection_update',
                        'message': {
                            'action': 'category_deleted',
                            'category_id': instance.id
                        }
                    }
                )
            except Exception as e:
                print(f"WebSocket error: {str(e)}")
                
        except Exception as e:
            print(f"Error deleting category: {str(e)}")
            raise
        

    @action(detail=True, methods=['patch'])
    def update_tags(self, request, pk=None):
        """Update tags for a category"""
        try:
            category = self.get_object()
            
            # Add debugging
            print(f"Updating tags for category {category.id}: {category.name}")
            print(f"Request data: {request.data}")
            
            # Check if the category belongs to the user
            if category.user != request.user:
                return Response(
                    {'error': 'You do not have permission to modify this collection'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            tags = request.data.get('tags', [])
            print(f"Received tags: {tags}")
            
            # Ensure tags is actually a list
            if isinstance(tags, str):
                try:
                    tags = json.loads(tags)
                except:
                    pass
                    
            if not isinstance(tags, list):
                tags = []
                
            category.set_tags(tags)
            category.save()
            
            print(f"Tags saved, current value: {category.tags}")
            
            return Response({
                'id': category.id,
                'name': category.name,
                'tags': category.get_tags()
            })
            
        except Exception as e:
            print(f"Error updating category tags: {str(e)}")
            return Response(
                {'error': f'Failed to update collection tags: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ImageViewSet(viewsets.ModelViewSet):
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser) 
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], serializer_class=ImageUploadSerializer)
    def upload(self, request):
        """Upload a new image to S3 and save metadata."""
        print("DEBUG: Image upload endpoint called")
        print("DEBUG: Request data:", request.data)
        print("DEBUG: Request FILES:", request.FILES)
        
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            data = serializer.validated_data
            category = data['category']
            
            # Check if the category belongs to the user
            if category.user != request.user:
                return Response(
                    {'error': 'You do not have permission to modify this collection'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            print(f"DEBUG: Serializer valid. Category: {category.name} (ID: {category.id})")
            
            # Upload file to S3 with user ID
            is_wishlist = 'is_wishlist' in request.data and request.data['is_wishlist'] == 'true'
            s3_path = upload_file_to_s3(data['file'], category.name, request.user.id, is_wishlist)
            print(f"DEBUG: S3 path: {s3_path}")
            
            if s3_path:
                # Create image record with additional fields
                image = Image.objects.create(
                    title=data['title'],
                    path=s3_path,
                    category=category,
                    is_wishlist=is_wishlist
                )
                if 'purchase_url' in request.data and request.data['purchase_url']:
                    image.purchase_url = request.data['purchase_url']

                if 'is_wishlist' in request.data:
                    image.is_wishlist = request.data['is_wishlist'] == 'true'

                if 'purchase_url' in request.data:
                    image.purchase_url = request.data['purchase_url']
                
                # Process additional fields if present in request data
                if 'description' in request.data:
                    image.description = request.data['description']
                    
                if 'valuation' in request.data:
                    try:
                        value = request.data['valuation']
                        if value:
                            image.valuation = float(value)
                    except (ValueError, TypeError):
                        pass  # Invalid value, just skip
                    
                # Handle tags if present
                if 'tags' in request.data:
                    try:
                        tags_data = request.data['tags']
                        
                        # If tags comes as a string (stringified JSON), parse it
                        if isinstance(tags_data, str):
                            import json
                            try:
                                tags = json.loads(tags_data)
                                if isinstance(tags, list):
                                    image.set_tags(tags)
                            except json.JSONDecodeError:
                                pass  # Invalid JSON, skip
                    except Exception as e:
                        print(f"DEBUG: Error processing tags: {str(e)}")
                
                # Save the image with all fields
                image.save()
                
                print(f"DEBUG: Image created with ID: {image.id}")
                
                # WebSocket update code...
                # [Keep the existing WebSocket code]
                
                return Response(
                    ImageSerializer(image).data,
                    status=status.HTTP_201_CREATED
                )
            else:
                print("DEBUG: Failed to upload to S3")
                return Response(
                    {'error': 'Failed to upload image to S3'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        print("DEBUG: Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_destroy(self, instance):
        """Override to clean up S3 resources before deleting the image"""
        try:
            category_id = instance.category.id
            image_id = instance.id
            
            # Delete the file from S3
            if instance.path:
                delete_s3_file(instance.path)
                
            # Delete the image from database
            instance.delete()
            
            # Send WebSocket update
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'collection_{category_id}',
                    {
                        'type': 'collection_update',
                        'message': {
                            'action': 'image_deleted',
                            'image_id': image_id
                        }
                    }
                )
            except Exception as e:
                print(f"WebSocket error: {str(e)}")
                
        except Exception as e:
            print(f"Error deleting image: {str(e)}")
            raise
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple images at once"""
        print("BULK DELETE ENDPOINT REACHED")
        print("Request data:", request.data)
        
        image_ids = request.data.get('image_ids', [])
        
        if not image_ids:
            print("No image IDs provided")
            return Response(
                {'error': 'No image IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"Attempting to delete {len(image_ids)} images: {image_ids}")
        # Get the images
        images = Image.objects.filter(id__in=image_ids)
        
        # Group images by category for WebSocket updates
        images_by_category = {}
        for image in images:
            if image.category.id not in images_by_category:
                images_by_category[image.category.id] = []
            images_by_category[image.category.id].append(image.id)
        
        deleted_count = 0
        for image in images:
            try:
                # Delete the file from S3
                if image.path:
                    delete_s3_file(image.path)
                    
                # Delete the image from database
                image.delete()
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting image {image.id}: {str(e)}")
        
        # Send WebSocket updates for each category
        channel_layer = get_channel_layer()
        for category_id, image_ids in images_by_category.items():
            try:
                async_to_sync(channel_layer.group_send)(
                    f'collection_{category_id}',
                    {
                        'type': 'collection_update',
                        'message': {
                            'action': 'images_bulk_deleted',
                            'image_ids': image_ids
                        }
                    }
                )
            except Exception as e:
                print(f"WebSocket error for category {category_id}: {str(e)}")
                
        return Response(
            {'deleted_count': deleted_count},
            status=status.HTTP_200_OK
        )
    
    def get_queryset(self):
        # Filter by the current user
        if self.request.user.is_authenticated:
            return Image.objects.filter(category__user=self.request.user)
        return Image.objects.none()
    
    @action(detail=True, methods=['patch'])
    def update_details(self, request, pk=None):
        """Update image details (title, description, valuation, tags)"""
        try:
            image = self.get_object()
            
            # Check if the image belongs to the user
            if image.category.user != request.user:
                return Response(
                    {'error': 'You do not have permission to modify this image'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Log request data
            print(f"Request content type: {request.content_type}")
            print(f"Request data: {request.data}")
            
            # Update fields
            if 'title' in request.data:
                image.title = request.data['title']
                print(f"Updated title to: {image.title}")
            
            if 'description' in request.data:
                image.description = request.data['description']
                print(f"Updated description to: {image.description}")
            
            if 'valuation' in request.data:
                try:
                    value = request.data['valuation']
                    image.valuation = float(value) if value and value.strip() else None
                    print(f"Updated valuation to: {image.valuation}")
                except (ValueError, TypeError, AttributeError) as e:
                    print(f"Error converting valuation: {str(e)}")
            
            if 'tags' in request.data:
                try:
                    tags_data = request.data['tags']
                    
                    # If tags comes as a string (stringified JSON), parse it
                    if isinstance(tags_data, str):
                        import json
                        try:
                            tags = json.loads(tags_data)
                        except json.JSONDecodeError:
                            tags = [tags_data]  # Not valid JSON, treat as single tag
                    else:
                        tags = tags_data
                    
                    # Ensure tags is a list
                    if isinstance(tags, list):
                        image.set_tags(tags)
                        print(f"Updated tags to: {tags}")
                    else:
                        print(f"Tags data not in expected format: {tags_data}")
                except Exception as tag_error:
                    print(f"Error processing tags: {str(tag_error)}")
            
            image.save()
            print(f"Image updated successfully: {image.id} - {image.title}")
            
            # Return updated image data
            serializer = ImageSerializer(image)
            return Response(serializer.data)
            
        except Exception as e:
            print(f"Error updating image details: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to update image details: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=True, methods=['post'])
    def transfer_to_collection(self, request, pk=None):
        """Transfer item from wishlist to main collection"""
        try:
            image = self.get_object()
            
            # Verify image belongs to the user
            if image.category.user != request.user:
                return Response(
                    {'error': 'You do not have permission to modify this image'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if image is a wishlist item
            if not image.is_wishlist:
                return Response(
                    {'error': 'This image is not a wishlist item'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the S3 path
            current_path = image.path
            
            # Parse the path to create new destination path
            if 'wishlist/' in current_path:
                # Replace 'wishlist/' with empty string
                new_path = current_path.replace('wishlist/', '')
            else:
                return Response(
                    {'error': 'Path does not contain wishlist folder'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Move file in S3
            s3_client = get_s3_client()
            try:
                # Copy the file to the new location
                s3_client.copy_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    CopySource={
                        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                        'Key': current_path
                    },
                    Key=new_path
                )
                
                # Delete the old file
                s3_client.delete_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=current_path
                )
                
                # Update the image record
                image.path = new_path
                image.is_wishlist = False
                image.purchase_url = None  # Clear purchase URL
                image.save()
                
                # Return updated image
                serializer = ImageSerializer(image)
                return Response(serializer.data)
                
            except Exception as s3_error:
                print(f"S3 error during transfer: {str(s3_error)}")
                return Response(
                    {'error': f'Failed to transfer file in S3: {str(s3_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            print(f"Error transferring image: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to transfer image: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
@api_view(['POST'])
def bulk_delete_images(request):
    """Standalone view to delete multiple images at once"""
    print("BULK DELETE STANDALONE VIEW REACHED")
    print("Request data:", request.data)
    
    image_ids = request.data.get('image_ids', [])
    
    if not image_ids:
        print("No image IDs provided")
        return Response(
            {'error': 'No image IDs provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    print(f"Attempting to delete {len(image_ids)} images: {image_ids}")
    
    # Get the images
    images = Image.objects.filter(id__in=image_ids)
    
    # Group images by category for WebSocket updates
    images_by_category = {}
    for image in images:
        if image.category.id not in images_by_category:
            images_by_category[image.category.id] = []
        images_by_category[image.category.id].append(image.id)
    
    deleted_count = 0
    for image in images:
        try:
            # Delete the file from S3
            if image.path:
                delete_s3_file(image.path)
                
            # Delete the image from database
            image.delete()
            deleted_count += 1
            print(f"Deleted image {image.id}")
        except Exception as e:
            print(f"Error deleting image {image.id}: {str(e)}")
    
    # Send WebSocket updates for each category
    channel_layer = get_channel_layer()
    for category_id, image_ids in images_by_category.items():
        try:
            async_to_sync(channel_layer.group_send)(
                f'collection_{category_id}',
                {
                    'type': 'collection_update',
                    'message': {
                        'action': 'images_bulk_deleted',
                        'image_ids': image_ids
                    }
                }
            )
            print(f"Sent WebSocket update for category {category_id}")
        except Exception as e:
            print(f"WebSocket error for category {category_id}: {str(e)}")
            
    return Response(
        {'deleted_count': deleted_count},
        status=status.HTTP_200_OK
    )

class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]  # Allow anyone to view profiles
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'profile__display_name']
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=True, methods=['get'])
    def categories(self, request, pk=None):
        """Get categories for a user"""
        user = self.get_object()
        public_only = request.query_params.get('public_only', 'false').lower() == 'true'
        
        # If viewing own profile or not requesting public_only, show all
        if str(user.id) == str(request.user.id) or not public_only:
            categories = Category.objects.filter(user=user)
        else:
            # Otherwise, only show public categories
            categories = Category.objects.filter(user=user, is_public=True)
            
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
    
    # @action(detail=True, methods=['get'])
    # def stats(self, request, pk=None):
    #     """Get follower and following counts for a user"""
    #     user = self.get_object()
    #     follower_count = UserFollow.objects.filter(followed=user).count()
    #     following_count = UserFollow.objects.filter(follower=user).count()
        
    #     return Response({
    #         'follower_count': follower_count,
    #         'following_count': following_count,
    #         'is_following': request.user.is_authenticated and 
    #                         UserFollow.objects.filter(follower=request.user, followed=user).exists()
    #     })

    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """Get followers for a specific user"""
        user = self.get_object()
        followers = UserFollow.objects.filter(followed=user)
        user_ids = followers.values_list('follower_id', flat=True)
        users = User.objects.filter(id__in=user_ids)
        serializer = UserProfileSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """Get users that a specific user follows"""
        user = self.get_object()
        following = UserFollow.objects.filter(follower=user)
        user_ids = following.values_list('followed_id', flat=True)
        users = User.objects.filter(id__in=user_ids)
        serializer = UserProfileSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)
    
    # Replace the update_profile action in views.py with this version
    @action(detail=True, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request, pk=None):
        """Update user profile data"""
        print(f"Request content type: {request.content_type}")
        print(f"Request data type: {type(request.data)}")
        
        # Check if user is updating their own profile
        if str(request.user.id) != str(pk):
            return Response(
                {'error': 'You can only update your own profile'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        user = self.get_object()
        profile_picture_path = None
        
        # Handle profile picture upload first
        if 'profile_picture' in request.FILES:
            profile_pic = request.FILES['profile_picture']
            profile_picture_path = upload_file_to_s3(
                profile_pic, 
                'profile_pictures', 
                user.id
            )
            
            if not profile_picture_path:
                return Response(
                    {'error': 'Failed to upload profile picture'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Update user fields directly
        if 'first_name' in request.data:
            user.first_name = request.data.get('first_name')
        if 'last_name' in request.data:
            user.last_name = request.data.get('last_name')
        user.save()
        
        # Get or create user profile
        try:
            profile = user.profile
        except:
            from api.models import UserProfile
            profile = UserProfile.objects.create(user=user)
            print(f"Created profile for user {user.username}")
        
        # Update profile fields directly
        if 'bio' in request.data:
            profile.bio = request.data.get('bio')
        if 'display_name' in request.data:
            profile.display_name = request.data.get('display_name')
        if profile_picture_path:
            profile.profile_picture = profile_picture_path
        
        profile.save()
        print(f"Manually updated profile: bio='{profile.bio}', display_name='{profile.display_name}'")
        
        # Return the updated user data using the serializer for read
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='goals')
    def list_goal(self, request, pk=None):
        print("Attempting to list goal")
        """Retrieve goals for a specific user (from pk)."""
        try:
            # Fetch the user's profile using the pk from the URL
            user_profile = UserProfile.objects.get(user__id=pk)
            
            # Check if the requesting user has permission to access this resource
            if request.user.id != int(pk):
                return Response(
                    {"error": "You do not have permission to access this resource."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Fetch goals for the specified user
            goals = Goal.objects.filter(user_profile=user_profile)
            serializer = GoalSerializer(goals, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to fetch goals: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='goals')
    def create_goal(self, request, pk=None):
        print("Attempting to create goal")
        """Create a new goal for a specific user (from pk)."""
        try:
            # Fetch the user's profile using the pk from the URL
            user_profile = UserProfile.objects.get(user__id=pk)

            # Check if the requesting user has permission to access this resource
            if request.user.id != int(pk):
                return Response(
                    {"error": "You do not have permission to create a goal for this user."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Deserialize and validate the incoming data
            serializer = GoalSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user_profile=user_profile)
                return Response(
                    {"message": "Goal created successfully!", "goal": serializer.data},
                    status=status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create goal: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserFollowViewSet(viewsets.ModelViewSet):
    serializer_class = UserFollowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserFollow.objects.filter(
            models.Q(follower=self.request.user) | 
            models.Q(followed=self.request.user)
        )
    
    @action(detail=False, methods=['post'])
    def follow(self, request):
        user_to_follow = request.data.get('user_id')
        if not user_to_follow:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = User.objects.get(id=user_to_follow)
            
            # Don't allow following yourself
            if user.id == request.user.id:
                return Response(
                    {'error': 'You cannot follow yourself'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if already following
            if UserFollow.objects.filter(follower=request.user, followed=user).exists():
                return Response(
                    {'error': 'Already following this user'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            follow = UserFollow.objects.create(follower=request.user, followed=user)
            serializer = UserFollowSerializer(follow)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def unfollow(self, request):
        user_to_unfollow = request.data.get('user_id')
        if not user_to_unfollow:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = User.objects.get(id=user_to_unfollow)
            follow = UserFollow.objects.filter(follower=request.user, followed=user)
            
            if not follow.exists():
                return Response(
                    {'error': 'You are not following this user'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            follow.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def followers(self, request):
        """Get users who follow the current user"""
        followers = UserFollow.objects.filter(followed=request.user)
        user_ids = followers.values_list('follower_id', flat=True)
        users = User.objects.filter(id__in=user_ids)
        serializer = UserProfileSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def following(self, request):
        """Get users the current user follows"""
        following = UserFollow.objects.filter(follower=request.user)
        user_ids = following.values_list('followed_id', flat=True)
        users = User.objects.filter(id__in=user_ids)
        serializer = UserProfileSerializer(users, many=True, context={'request': request})
        return Response(serializer.data) 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_data(request):
    user = request.user

    # Get or create FinancialInfo object
    financial_info, created = FinancialInfo.objects.get_or_create(user=user)

    total_spending = financial_info.get_total_spending()
    collection_prices = financial_info.get_collection_prices()
    monthly_spending = financial_info.get_monthly_spending()

    return Response({
        "totalSpending": total_spending,
        "collections": collection_prices,
        "monthlySpending": monthly_spending,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_stats(request):
    """Retrieve total value, collections, and items for a user's profile."""
    user = request.user
    try:
        profile_stats, _ = ProfileStats.objects.get_or_create(user=user)
        return Response({
            "totalValue": profile_stats.get_total_value(),
            "totalCollections": profile_stats.get_total_collections(),
            "totalItems": profile_stats.get_total_items(),
        })
    except Exception as e:
        return Response({"error": f"Failed to fetch profile stats: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_ai_field_view(request):
    title = request.data.get("title")
    collection = request.data.get("collection")
    is_wishlist = request.data.get("is_wishlist", False)

    if not title or not collection:
        return Response({"error": "Title and collection are required."}, status=400)

    prompt = f"""
    Based off the title '{title}' and in the collection '{collection}', find a purchase_url where the item is sold, generate a creative but brief description no more than 30 words, and based off the link found, use the value in that link (no ranges, no text, just a number), and three relevant tags for that item. 
    {"Also provide a purchase URL." if is_wishlist else ""}

    Respond ONLY in JSON format like this:
    {{
    "description": "A breif description...",
    "valuation": 250,  // Only a number, no currency symbols or ranges
    "tags": ["tag1", "tag2", "tag3"],
    "purchase_url": "https://example.com/item"  // Only if wishlist is true
    }}
    """

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"

    data = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }

    try:
        response = requests.post(
            gemini_url,
            headers={"Content-Type": "application/json"},
            json=data,
        )
        response.raise_for_status()
        gemini_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]

        # Extract JSON block using regex
        json_match = re.search(r'\{.*\}', gemini_text, re.DOTALL)
        if not json_match:
            return Response({"error": "No JSON found in AI response."}, status=500)

        json_text = json_match.group(0)

        try:
            result = json.loads(json_text)
        except json.JSONDecodeError as e:
            return Response({"error": f"Failed to parse JSON: {str(e)}"}, status=500)


        return Response(result, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# Add this import at the top if not already there
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .utils import generate_presigned_url

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_by_tag(request):
    """Search for content (categories and images) by tag"""
    tag = request.query_params.get('tag')
    
    if not tag:
        return Response({"error": "Tag parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Search for categories with the tag
        categories = Category.objects.filter(
            is_public=True  # Only public categories
        ).exclude(
            user=request.user  # Exclude current user's categories
        )
        
        # Find categories with matching tags
        category_results = []
        for category in categories:
            tags = category.get_tags()
            if tag.lower() in [t.lower() for t in tags]:
                user = category.user
                # Create user profile data
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'profile_picture_url': None,
                    'display_name': None
                }
                
                # Add profile data if exists
                if hasattr(user, 'profile'):
                    user_data['profile_picture_url'] = generate_presigned_url(user.profile.profile_picture) if user.profile.profile_picture else None
                    user_data['display_name'] = user.profile.display_name
                
                category_results.append({
                    'type': 'category',
                    'id': category.id,
                    'title': category.name,
                    'image_url': generate_presigned_url(category.placeholder_image) if category.placeholder_image else None,
                    'user': user_data
                })
        
        # Search for images with the tag
        images = Image.objects.filter(
            category__is_public=True,  # Only public categories
            is_wishlist=False  # Exclude wishlist items
        ).exclude(
            category__user=request.user  # Exclude current user's images
        )
        
        # Find images with matching tags
        image_results = []
        for image in images:
            tags = image.get_tags()
            if tag.lower() in [t.lower() for t in tags]:
                user = image.category.user
                # Create user profile data
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'profile_picture_url': None,
                    'display_name': None
                }
                
                # Add profile data if exists
                if hasattr(user, 'profile'):
                    user_data['profile_picture_url'] = generate_presigned_url(user.profile.profile_picture) if user.profile.profile_picture else None
                    user_data['display_name'] = user.profile.display_name
                
                image_results.append({
                    'type': 'image',
                    'id': image.id,
                    'title': image.title,
                    'image_url': generate_presigned_url(image.path) if image.path else None,
                    'category_id': image.category.id,
                    'category_name': image.category.name,
                    'user': user_data
                })
        
        # Combine results
        all_results = category_results + image_results
        
        return Response(all_results)
    except Exception as e:
        print(f"Error in tag search: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Search failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )