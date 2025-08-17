# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from .views import (
    CategoryViewSet,
    ImageViewSet,
    UserFollowViewSet,
    UserProfileViewSet,
    bulk_delete_images,
    test_cors,
    test_auth,
    financial_data,
    profile_stats,
    search_by_tag,  # Added import for search_by_tag
)
from .auth import (
    GoogleLoginView,
    UserInfoView,
    LogoutView,
    GoogleLoginView,
    UserInfoView,
    LogoutView,
    DeleteUserView,
)
from .auth import GoogleLoginView, UserInfoView, LogoutView, DeleteUserView
from .views import generate_ai_field_view

app_name = 'api'

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'images', ImageViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'follows', UserFollowViewSet, basename='follows')

# Add this function before the urlpatterns
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

urlpatterns = [
    # Fix the auth endpoints to be consistent, auth implimentation
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/user/', UserInfoView.as_view(), name='user-info'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('test-auth/', test_auth, name='test-auth'), # this is a test path
    path('get-csrf-token/', get_csrf_token, name='get-csrf-token'), 
    path('auth/delete-account/', DeleteUserView.as_view(), name='delete-account'),

    # Followers implimentation
    path('follows/follow/', UserFollowViewSet.as_view({'post': 'follow'}), name='follow-user'),
    path('follows/unfollow/', UserFollowViewSet.as_view({'post': 'unfollow'}), name='unfollow-user'),
    path('follows/followers/', UserFollowViewSet.as_view({'get': 'followers'}), name='user-followers'),
    path('follows/following/', UserFollowViewSet.as_view({'get': 'following'}), name='user-following'),
    path('categories/<int:pk>/toggle-visibility/', CategoryViewSet.as_view({'patch': 'toggle_visibility'}), name='category-toggle-visibility'),

    # User stats
    # path('profiles/stats/', UserProfileViewSet.as_view({'get': 'stats'}), name='user-stats'),
    path('profiles/<int:pk>/followers/', UserProfileViewSet.as_view({'get': 'followers'}), name='user-followers'),
    path('profiles/<int:pk>/following/', UserProfileViewSet.as_view({'get': 'following'}), name='user-following'),
    path('profiles/stats/', profile_stats, name='profile-stats'),
    path('financial-data/', financial_data, name='financial-data'),
    path('profiles/<int:pk>/goals/', UserProfileViewSet.as_view({'get': 'list_goal', 'post': 'create_goal'})),
    # path('profiles/goals/', UserGoalsViewSet.as_view({'get': 'list_goal', 'post': 'create_goal'})),

    # update user information
    path('profiles/<int:pk>/update/', UserProfileViewSet.as_view({'put': 'update_profile', 'patch': 'update_profile'}), name='update-profile'),
    path('categories/<int:pk>/update-tags/', CategoryViewSet.as_view({'patch': 'update_tags'}), name='category-update-tags'),
    path('images/<int:pk>/update-details/', ImageViewSet.as_view({'patch': 'update_details'}), name='image-update-details'),

    # Basic functionality for a user endpoints
    path('', include(router.urls)),
    path('upload-category-with-image/', CategoryViewSet.as_view({'post': 'upload_with_image'}), name='category-upload'),
    path('upload-image/', ImageViewSet.as_view({'post': 'upload'}), name='image-upload'),
    path('images/upload/', ImageViewSet.as_view({'post': 'upload'}), name='image-upload-alt'),
    path('bulk-delete-images/', bulk_delete_images, name='image-bulk-delete'),
    path('test-cors/', test_cors, name='test-cors'),
    path('images/<int:pk>/transfer-to-collection/', ImageViewSet.as_view({'post': 'transfer_to_collection'}), name='image-transfer-to-collection'),

    #Gemini field generation
    # path('generate-ai-fields/', generate_ai_fields_view, name='generate_ai_fields'),
    path('generate-ai-fields/', generate_ai_field_view, name='generate_ai_fields'),
    # for goals url
    path('profiles/<int:pk>/goals/', UserProfileViewSet.as_view({'get': 'list_goal', 'post': 'create_goal'}), name='userprofile-goals'),
    path('search/by-tag/', search_by_tag, name='search-by-tag'),
]