from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/collections/(?P<collection_id>\w+)/$', consumers.CollectionConsumer.as_asgi()),
    # Alternative path for debugging
    re_path(r'ws/api/categories/(?P<collection_id>\w+)/$', consumers.CollectionConsumer.as_asgi()),
]