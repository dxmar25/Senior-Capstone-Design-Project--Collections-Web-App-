from django.contrib.auth.models import User
from django.contrib.auth import login
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from google.oauth2 import id_token
from google.auth.transport import requests
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import os
from django.conf import settings

@method_decorator(csrf_exempt, name='dispatch')
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        try:
            token = request.data.get('token')
            client_id = os.environ.get('GOOGLE_OAUTH_CLIENT_ID')
            print(f"Received token: {token[:10]}... for client ID: {client_id}")
            
            # Verify the token
            try:
                idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
                print(f"Token verification successful, user email: {idinfo.get('email')}")
            except Exception as e:
                print(f"Token verification failed: {str(e)}")
                return Response({'error': f'Token verification failed: {str(e)}'}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check if it's a Google token
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return Response({'error': 'Wrong issuer.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get or create the user
            email = idinfo['email']
            try:
                user = User.objects.get(email=email)
                print(f"Found existing user: {user.id}, {user.username}")
            except User.DoesNotExist:
                # Create a new user
                user = User.objects.create_user(
                    username=email,  # Use email as username
                    email=email,
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', '')
                )
                print(f"Created new user: {user.id}, {user.username}")
            
            # Login the user
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            print(f"User logged in: {request.user.is_authenticated}")
            
            # Add session debug info
            print(f"Session key: {request.session.session_key}")
            print(f"Session cookie domain: {settings.SESSION_COOKIE_DOMAIN}")
            print(f"Session cookie secure: {settings.SESSION_COOKIE_SECURE}")
            print(f"Session cookie samesite: {settings.SESSION_COOKIE_SAMESITE}")
            
            return Response({
                'user_id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_authenticated': True
            })        
        except Exception as e:
            print(f"Login error: {str(e)}")
            print(f"Request data: {request.data}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@method_decorator(csrf_exempt, name='dispatch')
class UserInfoView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        print(f"UserInfoView: User authenticated? {request.user.is_authenticated}")
        if request.user.is_authenticated:
            print(f"User info: {request.user.id}, {request.user.username}")
            return Response({
                'user_id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'is_authenticated': True
            })
        return Response({'is_authenticated': False})

# In auth.py, update your LogoutView class
@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        from django.contrib.auth import logout
        print(f"Logout request received, user authenticated: {request.user.is_authenticated}")
        if request.user.is_authenticated:
            logout(request)
            return Response({'success': True})
        return Response({'success': False, 'message': 'Not logged in'})
    
@method_decorator(csrf_exempt, name='dispatch')
class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            print(f"Delete account request received for user: {user.id}, {user.email}")
            
            # Get all categories for this user
            from .models import Category
            user_categories = Category.objects.filter(user=user)
            
            # Delete all S3 content for this user
            from .utils import delete_s3_folder
            
            # Create user folder prefix
            user_prefix = f"user_{user.id}/"
            print(f"Deleting all S3 content with prefix: {user_prefix}")
            
            # Delete all user content from S3
            deleted_count = delete_s3_folder(user_prefix, include_prefix=True)
            print(f"Deleted {deleted_count} files from S3 for user {user.id}")
            
            # Delete the user (cascades to delete all related objects in DB)
            username = user.username
            email = user.email
            user.delete()
            
            print(f"User {username} ({email}) successfully deleted")
            return Response({"success": True, "message": "Account successfully deleted"})
            
        except Exception as e:
            print(f"Error deleting user account: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"success": False, "message": f"Error deleting account: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )