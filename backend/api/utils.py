import os
import uuid
import boto3
from django.conf import settings

def get_s3_client():
    """
    Creates and returns an S3 client
    """
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )

def upload_file_to_s3(file, category_name, user_id=None):
    """Uploads a file to S3 bucket"""
    try:
        print(f"DEBUG: Starting S3 upload for file: {file.name}")
        print(f"DEBUG: Category folder: {category_name}")
        print(f"DEBUG: User ID: {user_id}")
        
        # Debugging AWS credentials
        print(f"DEBUG: AWS Access Key ID set: {'Yes' if settings.AWS_ACCESS_KEY_ID else 'No'}")
        print(f"DEBUG: AWS Secret Access Key set: {'Yes' if settings.AWS_SECRET_ACCESS_KEY else 'No'}")
        print(f"DEBUG: AWS Bucket Name: {settings.AWS_STORAGE_BUCKET_NAME}")
        
        # Generate a unique filename
        ext = os.path.splitext(file.name)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Check user_id
        if not user_id:
            print("ERROR: User ID is required for uploads")
            return None
            
        # Define the S3 path with user ID
        s3_path = f"user_{user_id}/{category_name}/{unique_filename}"
        print(f"DEBUG: Generated S3 path: {s3_path}")
        
        try:
            # Upload to S3
            client = get_s3_client()
            client.upload_fileobj(
                file,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_path,
                ExtraArgs={
                    'ContentType': file.content_type
                }
            )
            print(f"DEBUG: Successfully uploaded to S3 at path: {s3_path}")
            return s3_path
        except Exception as s3_error:
            print(f"ERROR: S3 upload failed: {str(s3_error)}")
            import traceback
            print(traceback.format_exc())
            return None
            
    except Exception as e:
        print(f"ERROR: General upload error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None

def generate_presigned_url(object_key, expiration=3600):
    """
    Generate a presigned URL for an S3 object
    
    Args:
        object_key: The S3 object key
        expiration: URL expiration time in seconds (default: 1 hour)
        
    Returns:
        Presigned URL string or None if error
    """
    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': object_key
            },
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return None

def list_files_in_category(category_name):
    """
    Lists all files in a category folder in S3
    
    Args:
        category_name: The category name (folder)
    
    Returns:
        List of objects in the category
    """
    try:
        client = get_s3_client()
        response = client.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Prefix=f"{category_name}/"
        )
        
        if 'Contents' in response:
            return response['Contents']
        return []
    
    except Exception as e:
        print(f"Error listing S3 files: {str(e)}")
        return []
    
def delete_s3_file(object_key):
    """
    Delete a file from S3 bucket
    
    Args:
        object_key: The S3 object key
    
    Returns:
        True if successful, False otherwise
    """
    try:
        client = get_s3_client()
        client.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=object_key
        )
        return True
    except Exception as e:
        print(f"Error deleting S3 file: {str(e)}")
        return False
    
def delete_s3_folder(prefix, user_id=None):
    """
    Delete all files in a folder from S3 bucket
    
    Args:
        prefix: The folder path prefix
        user_id: The user ID for user-specific folder
    
    Returns:
        Number of deleted objects or -1 if error
    """
    try:
        client = get_s3_client()
        # List all objects in the folder
        objects = []
        paginator = client.get_paginator('list_objects_v2')
        
        # Ensure prefix ends with a slash
        if not prefix.endswith('/'):
            prefix = f"{prefix}/"
            
        # Add user ID to the prefix if provided
        if user_id:
            full_prefix = f"user_{user_id}/{prefix}"
        else:
            full_prefix = prefix
            
        print(f"Deleting objects with prefix: {full_prefix}")
        
        for page in paginator.paginate(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Prefix=full_prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects.append({'Key': obj['Key']})
                    print(f"Found object to delete: {obj['Key']}")
        
        # If no objects found, return 0
        if not objects:
            print(f"No objects found with prefix: {full_prefix}")
            return 0
            
        # Delete the objects
        response = client.delete_objects(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Delete={'Objects': objects}
        )
        
        print(f"Deleted objects response: {response}")
        return len(objects)
    except Exception as e:
        print(f"Error deleting S3 folder: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return -1
    
def delete_s3_folder(prefix, user_id=None, include_prefix=False):
    """
    Delete all files in a folder from S3 bucket
    
    Args:
        prefix: The folder path prefix
        user_id: The user ID for user-specific folder
        include_prefix: If True, use prefix as is (for full user deletion)
    
    Returns:
        Number of deleted objects or -1 if error
    """
    try:
        client = get_s3_client()
        # List all objects in the folder
        objects = []
        paginator = client.get_paginator('list_objects_v2')
        
        # Determine the full prefix
        if include_prefix:
            # Use prefix as is (for user deletion)
            full_prefix = prefix
        else:
            # Ensure prefix ends with a slash
            if not prefix.endswith('/'):
                prefix = f"{prefix}/"
                
            # Add user ID to the prefix if provided
            if user_id:
                full_prefix = f"user_{user_id}/{prefix}"
            else:
                full_prefix = prefix
            
        print(f"Deleting objects with prefix: {full_prefix}")
        
        for page in paginator.paginate(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Prefix=full_prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects.append({'Key': obj['Key']})
                    print(f"Found object to delete: {obj['Key']}")
        
        # If no objects found, return 0
        if not objects:
            print(f"No objects found with prefix: {full_prefix}")
            return 0
            
        # Delete the objects in batches (maximum 1000 per request)
        batch_size = 1000
        deleted_count = 0
        
        for i in range(0, len(objects), batch_size):
            batch = objects[i:i + batch_size]
            response = client.delete_objects(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Delete={'Objects': batch}
            )
            deleted_count += len(batch)
            print(f"Deleted batch of {len(batch)} objects")
        
        return deleted_count
    except Exception as e:
        print(f"Error deleting S3 folder: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return -1
    
def upload_file_to_s3(file, category_name, user_id=None, is_wishlist=False):
    """Uploads a file to S3 bucket"""
    try:
        print(f"DEBUG: Starting S3 upload for file: {file.name}")
        print(f"DEBUG: Category folder: {category_name}")
        print(f"DEBUG: User ID: {user_id}")
        print(f"DEBUG: Is wishlist: {is_wishlist}")
        
        # Generate a unique filename
        ext = os.path.splitext(file.name)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Check user_id
        if not user_id:
            print("ERROR: User ID is required for uploads")
            return None
            
        # Define the S3 path with user ID
        if is_wishlist:
            s3_path = f"user_{user_id}/{category_name}/wishlist/{unique_filename}"
        else:
            s3_path = f"user_{user_id}/{category_name}/{unique_filename}"
            
        print(f"DEBUG: Generated S3 path: {s3_path}")
        
        # Upload to S3
        client = get_s3_client()
        client.upload_fileobj(
            file,
            settings.AWS_STORAGE_BUCKET_NAME,
            s3_path,
            ExtraArgs={
                'ContentType': file.content_type
            }
        )
        print(f"DEBUG: Successfully uploaded to S3 at path: {s3_path}")
        return s3_path
            
    except Exception as e:
        print(f"ERROR: General upload error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None