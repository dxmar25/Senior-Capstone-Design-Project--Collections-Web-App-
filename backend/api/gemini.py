# gemini.py
import os
import json
import google.generativeai as genai

def generate_ai_fields(title, collection, is_wishlist=False):
    if not title or not collection:
        raise ValueError("Title and collection are required.")

    prompt = f"""
    Generate a creative item description, an estimated value in USD, and three relevant tags for a collectible item.

    Title: {title}
    Collection Name: {collection}
    Wishlist Item: {"Yes" if is_wishlist else "No"}

    Format the result in this JSON format:
    {{
        "description": "...",
        "valuation": "...",
        "tags": ["...", "...", "..."],
        "purchase_url": "..."  // only include this if it's a wishlist item
    }}
    """

    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content(prompt)
    output = response.text

    return json.loads(output)
