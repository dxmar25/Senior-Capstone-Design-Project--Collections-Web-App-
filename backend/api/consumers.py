import json
import traceback
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Category, Image

class CollectionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            # Get collection_id from URL route
            self.collection_id = self.scope['url_route']['kwargs']['collection_id']
            self.collection_group_name = f'collection_{self.collection_id}'
            
            print(f"WebSocket connect attempt for collection: {self.collection_id}")
            
            # Validate that the collection exists (optional but recommended)
            # collection_exists = await self.get_collection()
            # if not collection_exists:
            #     print(f"Collection {self.collection_id} not found, rejecting connection")
            #     return  # This will close the connection
            
            # Join collection group
            await self.channel_layer.group_add(
                self.collection_group_name,
                self.channel_name
            )
            
            # Accept the connection
            await self.accept()
            print(f"WebSocket connection accepted for collection: {self.collection_id}")
            
            # Send a welcome message to confirm connection
            await self.send(text_data=json.dumps({
                'message': {
                    'action': 'connected',
                    'collection_id': self.collection_id
                }
            }))
            
        except Exception as e:
            print(f"Error in WebSocket connect: {str(e)}")
            print(traceback.format_exc())
            # Close connection with error
            await self.close(code=1011)

    @database_sync_to_async
    def get_collection(self):
        try:
            return Category.objects.filter(id=self.collection_id).exists()
        except Exception as e:
            print(f"Database error checking collection: {str(e)}")
            return False

    async def disconnect(self, close_code):
        try:
            print(f"WebSocket disconnecting for collection: {self.collection_id}, code: {close_code}")
            # Leave collection group
            await self.channel_layer.group_discard(
                self.collection_group_name,
                self.channel_name
            )
        except Exception as e:
            print(f"Error in WebSocket disconnect: {str(e)}")
            print(traceback.format_exc())

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            print(f"Received WebSocket message for collection {self.collection_id}: {text_data[:100]}")
            text_data_json = json.loads(text_data)
            message = text_data_json['message']

            # Send message to collection group
            await self.channel_layer.group_send(
                self.collection_group_name,
                {
                    'type': 'collection_update',
                    'message': message
                }
            )
        except Exception as e:
            print(f"Error in WebSocket receive: {str(e)}")
            print(traceback.format_exc())
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    # Receive message from collection group
    async def collection_update(self, event):
        try:
            message = event['message']
            print(f"Sending WebSocket update for collection {self.collection_id}")
            
            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'message': message
            }))
        except Exception as e:
            print(f"Error in WebSocket collection_update: {str(e)}")
            print(traceback.format_exc())