from flask import Blueprint, request, jsonify
from flask_cors import CORS
import json
import re
import requests
from datetime import datetime, timedelta
import threading
import time
import logging

# Create Blueprint instead of Flask app
app = Blueprint('api', __name__)
CORS(app)

# Configure logging
logger = logging.getLogger(__name__)

# In-memory storage for rooms (in production, use a database)
rooms = {}
room_cleanup_interval = 3600  # 1 hour

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_video_metadata(video_id):
    """Get video metadata from YouTube (basic implementation)"""
    try:
        # Use a simple approach to get video info
        # In production, use YouTube Data API v3
        url = f"https://www.youtube.com/watch?v={video_id}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            # Extract title from HTML (basic approach)
            title_match = re.search(r'<title>(.*?)</title>', response.text)
            title = title_match.group(1).replace(' - YouTube', '') if title_match else f'Video {video_id}'
            
            # Try multiple patterns to extract channel name
            uploader = 'Unknown Channel'
            
            # Pattern 1: Look for channelName in JSON-LD
            channel_patterns = [
                r'"channelName":"([^"]+)"',
                r'"author":"([^"]+)"',
                r'"uploader":"([^"]+)"',
                r'"channel":"([^"]+)"',
                r'"ownerChannelName":"([^"]+)"',
                r'"authorName":"([^"]+)"',
                r'<link itemprop="name" content="([^"]+)"',
                r'<meta property="og:site_name" content="([^"]+)"',
                r'"name":"([^"]+)".*?"@type":"Person"',
                r'"name":"([^"]+)".*?"@type":"Organization"'
            ]
            
            for pattern in channel_patterns:
                channel_match = re.search(pattern, response.text)
                if channel_match:
                    uploader = channel_match.group(1)
                    logger.debug(f"Found uploader using pattern: {pattern} -> {uploader}")
                    break
            
            # If still not found, try to extract from page structure
            if uploader == 'Unknown Channel':
                # Look for channel link
                channel_link_match = re.search(r'href="/channel/[^"]+"[^>]*>([^<]+)</a>', response.text)
                if channel_link_match:
                    uploader = channel_link_match.group(1).strip()
                    logger.debug(f"Found uploader from channel link: {uploader}")
            
            return {
                'title': title,
                'uploader': uploader,
                'thumbnail': f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg'
            }
    except Exception as e:
        logger.error(f"Error fetching video metadata: {e}")
    
    # Fallback
    return {
        'title': f'Video {video_id}',
        'uploader': 'Unknown Channel',
        'thumbnail': f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg'
    }

def cleanup_old_rooms():
    """Remove rooms that are older than 24 hours or have no participants"""
    current_time = datetime.now()
    rooms_to_remove = []
    
    for room_id, room in rooms.items():
        created_time = datetime.fromisoformat(room['createdAt'].replace('Z', '+00:00'))
        room_age = current_time - created_time.replace(tzinfo=None)
        
        # Remove if older than 24 hours or no participants left
        if room_age > timedelta(hours=24) or len(room['participants']) == 0:
            rooms_to_remove.append(room_id)
    
    for room_id in rooms_to_remove:
        del rooms[room_id]
        logger.info(f"Removed old room: {room_id}")

def cleanup_worker():
    """Background worker to clean up old rooms"""
    while True:
        cleanup_old_rooms()
        time.sleep(room_cleanup_interval)

# Start cleanup worker
cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
cleanup_thread.start()

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    """Get all active rooms"""
    active_rooms = [room for room in rooms.values() if room['isActive']]
    return jsonify(active_rooms)

@app.route('/api/rooms', methods=['POST'])
def create_room():
    """Create a new room"""
    data = request.json
    room_id = data.get('id')
    
    if room_id in rooms:
        return jsonify({'error': 'Room ID already exists'}), 400
    
    rooms[room_id] = data
    logger.info(f"Created room: {room_id}")
    return jsonify({'success': True, 'room_id': room_id})

@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    """Get a specific room"""
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    room_data = rooms[room_id]
    return jsonify(room_data)

@app.route('/api/rooms/<room_id>', methods=['PUT'])
def update_room(room_id):
    """Update a room"""
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    data = request.json
    rooms[room_id].update(data)
    return jsonify({'success': True})

@app.route('/api/rooms/<room_id>', methods=['DELETE'])
def delete_room(room_id):
    """Delete a room"""
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    del rooms[room_id]
    logger.info(f"Deleted room: {room_id}")
    return jsonify({'success': True})

@app.route('/api/rooms/<room_id>/leave', methods=['POST'])
def leave_room(room_id):
    """Handle participant leaving room"""
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    data = request.json
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    room = rooms[room_id]
    
    # Remove user from participants
    room['participants'] = [p for p in room['participants'] if p['id'] != user_id]
    
    # If leader is leaving, transfer leadership to another participant
    if room['leader'] == user_id and len(room['participants']) > 0:
        # Transfer to the first available participant
        new_leader = room['participants'][0]
        room['leader'] = new_leader['id']
        room['leaderUsername'] = new_leader['username']
        logger.info(f"Transferred leadership in room {room_id} to {new_leader['username']}")
    
    # If no participants left, mark room for deletion
    if len(room['participants']) == 0:
        room['isActive'] = False
        logger.info(f"Room {room_id} marked for deletion (no participants)")
    
    return jsonify({'success': True, 'room': room})

@app.route('/api/video/metadata', methods=['POST'])
def get_video_metadata_api():
    """Get video metadata for a YouTube URL"""
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    metadata = get_video_metadata(video_id)
    metadata['video_id'] = video_id
    metadata['url'] = url
    
    return jsonify(metadata)

def extract_playlist_id(url):
    """Extract YouTube playlist ID from URL"""
    patterns = [
        r'youtube\.com\/playlist\?list=([^&\n?#]+)',
        r'youtube\.com\/watch\?.*&list=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_playlist_metadata(playlist_id):
    """Get playlist metadata and videos from YouTube (basic implementation)"""
    try:
        # Use a simple approach to get playlist info
        # In production, use YouTube Data API v3
        url = f"https://www.youtube.com/playlist?list={playlist_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            # Extract playlist title
            title_match = re.search(r'<title>(.*?)</title>', response.text)
            playlist_title = title_match.group(1).replace(' - YouTube', '') if title_match else f'Playlist {playlist_id}'
            
            # Try to extract video IDs from the page's JSON data first (more reliable for order)
            video_ids = []
            seen_ids = set()
            
            # Look for JSON data that contains playlist information
            json_patterns = [
                r'var ytInitialData = ({.*?});',
                r'window\["ytInitialData"\] = ({.*?});',
                r'ytInitialData\s*=\s*({.*?});'
            ]
            
            for json_pattern in json_patterns:
                json_match = re.search(json_pattern, response.text, re.DOTALL)
                if json_match:
                    try:
                        import json
                        json_data = json.loads(json_match.group(1))
                        
                        # Navigate through the JSON structure to find playlist videos
                        def extract_videos_from_json(data, path=""):
                            if isinstance(data, dict):
                                for key, value in data.items():
                                    current_path = f"{path}.{key}" if path else key
                                    
                                    # Look for playlistPanelVideoRenderer which contains video data
                                    if key == "playlistPanelVideoRenderer" and isinstance(value, dict):
                                        video_id = value.get("videoId")
                                        if video_id and video_id not in seen_ids:
                                            video_ids.append(video_id)
                                            seen_ids.add(video_id)
                                            logger.debug(f"Found video in JSON: {video_id} at {current_path}")
                                    
                                    # Recursively search nested structures
                                    extract_videos_from_json(value, current_path)
                            elif isinstance(data, list):
                                for i, item in enumerate(data):
                                    current_path = f"{path}[{i}]"
                                    extract_videos_from_json(item, current_path)
                        
                        extract_videos_from_json(json_data)
                        
                        if video_ids:
                            logger.debug(f"Found {len(video_ids)} videos in JSON data")
                            break
                            
                    except json.JSONDecodeError:
                        logger.warning("Failed to parse JSON data, falling back to regex")
                        continue
            
            # If JSON extraction failed, fall back to regex patterns
            if not video_ids:
                logger.warning("Using regex fallback for video extraction")
                video_patterns = [
                    # Look for playlist-specific video entries
                    r'"videoId":"([^"]{11})".*?"playlistPanelVideoRenderer"',
                    r'playlistPanelVideoRenderer.*?"videoId":"([^"]{11})"',
                    # General patterns
                    r'"videoId":"([^"]{11})"',
                    r'data-video-id="([^"]{11})"',
                    r'href="/watch\?v=([^"]{11})"',
                    r'watch\?v=([^"]{11})'
                ]
                
                for pattern in video_patterns:
                    matches = re.findall(pattern, response.text)
                    for video_id in matches:
                        if video_id not in seen_ids:
                            video_ids.append(video_id)
                            seen_ids.add(video_id)
            
            # Limit to first 50 videos for performance
            video_ids = video_ids[:50]
            
            if not video_ids:
                return None
            
            # Get metadata for each video
            videos = []
            for video_id in video_ids:
                try:
                    video_metadata = get_video_metadata(video_id)
                    videos.append({
                        'video_id': video_id,
                        'title': video_metadata['title'],
                        'uploader': video_metadata['uploader'],
                        'thumbnail': video_metadata['thumbnail']
                    })
                except Exception as e:
                    logger.error(f"Error getting metadata for video {video_id}: {e}")
                    # Add fallback video data
                    videos.append({
                        'video_id': video_id,
                        'title': f'Video {video_id}',
                        'uploader': 'Unknown Channel',
                        'thumbnail': f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg'
                    })
            
            return {
                'playlist_id': playlist_id,
                'title': playlist_title,
                'videos': videos
            }
    except Exception as e:
        logger.error(f"Error fetching playlist metadata: {e}")
    
    return None

@app.route('/api/playlist/metadata', methods=['POST'])
def get_playlist_metadata_api():
    """Get playlist metadata for a YouTube playlist URL"""
    data = request.json
    url = data.get('url')
    playlist_id = data.get('playlistId')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    if not playlist_id:
        playlist_id = extract_playlist_id(url)
        if not playlist_id:
            return jsonify({'error': 'Invalid YouTube playlist URL'}), 400
    
    metadata = get_playlist_metadata(playlist_id)
    if not metadata:
        return jsonify({'error': 'Failed to fetch playlist data'}), 500
    
    return jsonify(metadata)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'rooms_count': len(rooms)})

