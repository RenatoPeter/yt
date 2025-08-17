// Room page variables
console.log('Room script loading...');

// API base URL utility
function getApiUrl(endpoint) {
    return `${window.location.origin}/api${endpoint}`;
}

let currentRoom = null;
let currentUser = null;
let isLeader = false;
let youtubePlayer = null;
let currentVideoIndex = 0;

console.log('Room script loaded successfully');
let isPlaying = false;
let syncInterval = null;
let isAddingVideo = false; // Flag to prevent sync conflicts during video addition
let isSkipOperation = false; // Flag to prevent interference during skip operations

// Default room permissions
const DEFAULT_PERMISSIONS = {
    playPause: false,      // Users can control video playback
    videoSeek: false,      // Users can seek in videos
    addVideo: false,       // Users can add videos
    removeVideo: false,    // Users can remove videos
    editPlaylist: false,   // Users can reorder playlist
    kickMembers: false     // Users can kick other users
};

// Check if user has permission for a specific action
function hasPermission(permission) {
    // Leader always has all permissions
    if (isLeader) {
        console.log(`Permission ${permission}: Granted (leader)`);
        return true;
    }
    
    // Check if room has permissions set
    if (!currentRoom.permissions) {
        currentRoom.permissions = DEFAULT_PERMISSIONS;
    }
    
    const hasPermission = currentRoom.permissions[permission] === true;
    console.log(`Permission ${permission}: ${hasPermission ? 'Granted' : 'Denied'} (regular user)`);
    return hasPermission;
}

// Initialize room page
console.log('Setting up DOMContentLoaded listener...');
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded event fired');
    try {
        console.log('About to call initializeRoom()');
        await initializeRoom();
        console.log('initializeRoom() called successfully');
    } catch (error) {
        console.error('Error calling initializeRoom():', error);
        alert('Hiba az initializeRoom hívásakor: ' + error.message);
    }
});

// Initialize the room
async function initializeRoom() {
    console.log('initializeRoom() called');
    
    try {
        // Get room ID and leader status from URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');
        isLeader = urlParams.get('isLeader') === 'true';
        
        console.log('Room ID from URL:', roomId);
        console.log('Is leader from URL:', isLeader);
        
        if (!roomId) {
            alert('Nincs megadva szoba azonosító');
            window.location.href = 'index.html';
            return;
        }
    
    console.log('About to show loading message');
    
    // Show loading message
    const mainContent = document.querySelector('.main-content');
    console.log('mainContent element:', mainContent);
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #fff;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 20px;"></i>
                <h2>Szoba betöltése...</h2>
                <p>Kérlek várj, amíg csatlakozunk a szobához.</p>
            </div>
        `;
        console.log('Loading message set');
    } else {
        console.log('mainContent element not found');
    }
    
    console.log('About to get current user');
    
    // Get current user from localStorage or generate new one
    const storedUser = localStorage.getItem('currentUser');
    console.log('Stored user:', storedUser);
    if (storedUser) {
        currentUser = storedUser;
        console.log('Using stored user:', currentUser);
    } else {
        // Generate user ID
        currentUser = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('currentUser', currentUser);
        console.log('Generated new user:', currentUser);
    }
    
    console.log('About to test Flask server connection');
    
    // Test Flask server connection
    try {
        const response = await fetch(getApiUrl('/health'));
        console.log('Health check response status:', response.status);
        if (response.ok) {
            console.log('Flask server is running');
        } else {
            console.warn('Flask server returned error status');
        }
    } catch (error) {
        console.warn('Flask server is not running, will use fallback mode:', error);
    }
    
    console.log('About to load room data for:', roomId);
    
    // Load room data
    try {
        await loadRoomData(roomId);
        console.log('loadRoomData completed successfully');
    } catch (error) {
        console.error('Error in loadRoomData:', error);
        alert('Hiba a szoba adatok betöltésekor: ' + error.message);
        return;
    }
    
    // Update leader status based on actual room data
    isLeader = currentRoom.leader === currentUser;
    
    // Clear loading message and restore room content
    console.log('Clearing loading message and restoring room content');
    const roomContentElement = document.querySelector('.main-content');
    if (roomContentElement) {
        // Restore the original room content structure
        roomContentElement.innerHTML = `
            <div class="room-content">
                <!-- Left Column -->
                <div class="left-column">
                    <!-- Video Player Section -->
                    <section class="video-section">
                        <div class="video-container">
                            <div id="youtubePlayer"></div>
                        </div>
                    </section>
                    
                    <!-- Participants Section -->
                    <section class="participants-section">
                        <h2><i class="fas fa-users"></i> Résztvevők</h2>
                        <div id="participantsList" class="participants-list">
                            <!-- Participants will be populated here -->
                        </div>
                    </section>
                </div>
                
                <!-- Right Column -->
                <div class="right-column">
                    <!-- Video Controls Section -->
                    <section class="video-controls-section">
                        <div class="video-controls">
                            <button id="playPauseBtn" class="btn btn-primary">
                                <i class="fas fa-play"></i> Lejátszás
                            </button>
                            <button id="skipBtn" class="btn btn-secondary">
                                <i class="fas fa-forward"></i> Ugrás
                            </button>
                            <div class="volume-control">
                                <i class="fas fa-volume-up"></i>
                                <input type="range" id="volumeSlider" min="0" max="100" value="50">
                            </div>
                        </div>
                    </section>

                    <!-- Playlist Section -->
                    <section class="playlist-section">
                        <div class="playlist-header">
                            <h2><i class="fas fa-list"></i> Lejátszási Lista</h2>
                            <button id="addVideoBtn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Videó Hozzáadása
                            </button>
                        </div>
                        <div id="playlistContainer" class="playlist-container">
                            <!-- Playlist items will be populated here -->
                        </div>
                    </section>
                </div>
            </div>
        `;
        console.log('Room content restored');
    }
    
    // Initialize YouTube player
    initializeYouTubePlayer();
    
    // Start sync interval
    startSyncInterval();
    
    // Start dedicated video sync system
    startVideoSync();
    
    // Show settings button for leaders
    if (isLeader) {
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.style.display = 'inline-block';
        }
    }
    
    // Setup event listeners AFTER DOM elements are created
    console.log('Setting up event listeners after DOM creation');
    setupRoomEventListeners();
    
    // Debug: Check if buttons are found
    console.log('=== BUTTON DEBUG ===');
    console.log('playPauseBtn:', document.getElementById('playPauseBtn'));
    console.log('skipBtn:', document.getElementById('skipBtn'));
    console.log('addVideoBtn:', document.getElementById('addVideoBtn'));
    console.log('video-controls:', document.querySelector('.video-controls'));
    } catch (error) {
        console.error('Error in initializeRoom:', error);
        alert('Hiba a szoba inicializálásakor: ' + error.message);
    }
}

// Load room data with retry mechanism
async function loadRoomData(roomId) {
    console.log('loadRoomData function called with roomId:', roomId);
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`Loading room data for: ${roomId} (attempt ${retryCount + 1})`);
            
            // Get room data from server
            console.log('Making fetch request to:', getApiUrl(`/rooms/${roomId}`));
            const response = await fetch(getApiUrl(`/rooms/${roomId}`));
            console.log('Server response status:', response.status);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('Raw response text:', responseText);
                
                try {
                    currentRoom = JSON.parse(responseText);
                    console.log('Room data loaded from server:', currentRoom);
                    
                    if (currentRoom && currentRoom.id) {
                        console.log('Room data loaded successfully');
                        console.log('Room ID:', currentRoom.id);
                        console.log('Room name:', currentRoom.name);
                        console.log('Room participants:', currentRoom.participants);
                        
                        // Update UI
                        updateRoomUI();
                        updatePlaylistDisplay();
                        updateParticipantsDisplay();
                        return; // Success, exit the retry loop
                    } else {
                        console.error('Room data is invalid or missing ID:', currentRoom);
                        console.error('Room data keys:', currentRoom ? Object.keys(currentRoom) : 'null');
                    }
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    console.error('Response text was:', responseText);
                }
            } else {
                console.log('Server request failed, trying localStorage fallback');
                // Fallback to localStorage
                const storedRooms = localStorage.getItem('youtubeRooms');
                if (storedRooms) {
                    const rooms = JSON.parse(storedRooms);
                    currentRoom = rooms.find(r => r.id === roomId);
                    console.log('Room data loaded from localStorage:', currentRoom);
                    
                    if (currentRoom) {
                        console.log('Room data loaded from localStorage successfully');
                        
                        // Update UI
                        updateRoomUI();
                        updatePlaylistDisplay();
                        updateParticipantsDisplay();
                        return; // Success, exit the retry loop
                    }
                }
            }
            
            // If we get here, room was not found
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`Room not found, retrying in 1 second... (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
            
        } catch (error) {
            console.error(`Error loading room data (attempt ${retryCount + 1}):`, error);
            console.error('Error details:', error.message);
            
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`Retrying in 1 second... (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }
    }
    
    // If we get here, all retries failed
    console.error('Failed to load room data after all retries');
    // Don't show alert, just redirect silently
    window.location.href = 'index.html';
}

// Setup room event listeners
function setupRoomEventListeners() {
    console.log('Setting up room event listeners...');
    
    // Remove existing event listeners to prevent duplicates
    const leaveRoomBtn = document.getElementById('leaveRoom');
    if (leaveRoomBtn) {
        // Clone and replace to remove old listeners
        const newLeaveBtn = leaveRoomBtn.cloneNode(true);
        leaveRoomBtn.parentNode.replaceChild(newLeaveBtn, leaveRoomBtn);
        newLeaveBtn.addEventListener('click', leaveRoom);
        console.log('Leave room button listener added');
    } else {
        console.error('Leave room button not found');
    }
    
    // Video controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        // Clone and replace to remove old listeners
        const newPlayPauseBtn = playPauseBtn.cloneNode(true);
        playPauseBtn.parentNode.replaceChild(newPlayPauseBtn, playPauseBtn);
        
        if (hasPermission('playPause')) {
            newPlayPauseBtn.addEventListener('click', togglePlayPause);
            newPlayPauseBtn.disabled = false;
            newPlayPauseBtn.classList.add('btn-enabled');
            newPlayPauseBtn.classList.remove('btn-disabled');
        } else {
            newPlayPauseBtn.disabled = true;
            newPlayPauseBtn.classList.add('btn-disabled');
            newPlayPauseBtn.classList.remove('btn-enabled');
            newPlayPauseBtn.title = 'No permission to play/pause';
        }
        console.log('Play/pause button listener added');
    } else {
        console.error('Play/pause button not found');
    }
    
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        // Clone and replace to remove old listeners
        const newSkipBtn = skipBtn.cloneNode(true);
        skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);
        
        if (hasPermission('playPause')) {
            newSkipBtn.addEventListener('click', skipVideo);
            newSkipBtn.disabled = false;
            newSkipBtn.classList.add('btn-enabled');
            newSkipBtn.classList.remove('btn-disabled');
        } else {
            newSkipBtn.disabled = true;
            newSkipBtn.classList.add('btn-disabled');
            newSkipBtn.classList.remove('btn-enabled');
            newSkipBtn.title = 'No permission to skip videos';
        }
        console.log('Skip button listener added');
    } else {
        console.error('Skip button not found');
    }
    
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', changeVolume);
        console.log('Volume slider listener added');
    } else {
        console.error('Volume slider not found');
    }
    
    // Add video button
    const addVideoBtn = document.getElementById('addVideoBtn');
    if (addVideoBtn) {
        if (hasPermission('addVideo')) {
            addVideoBtn.addEventListener('click', () => {
                document.getElementById('addVideoModal').style.display = 'block';
            });
            addVideoBtn.disabled = false;
            addVideoBtn.classList.add('btn-enabled');
            addVideoBtn.classList.remove('btn-disabled');
        } else {
            addVideoBtn.disabled = true;
            addVideoBtn.classList.add('btn-disabled');
            addVideoBtn.classList.remove('btn-enabled');
            addVideoBtn.title = 'No permission to add videos';
        }
        console.log('Add video button listener added');
    } else {
        console.error('Add video button not found');
    }
    
    const submitVideoBtn = document.getElementById('submitVideoBtn');
    if (submitVideoBtn) {
        submitVideoBtn.addEventListener('click', addVideo);
        console.log('Submit video button listener added');
    } else {
        console.error('Submit video button not found');
    }
    
    const cancelVideoBtn = document.getElementById('cancelVideoBtn');
    if (cancelVideoBtn) {
        cancelVideoBtn.addEventListener('click', hideAddVideoForm);
        console.log('Cancel video button listener added');
    } else {
        console.error('Cancel video button not found');
    }
    
    // Modal events
    const closeAddVideoModal = document.getElementById('closeAddVideoModal');
    if (closeAddVideoModal) {
        closeAddVideoModal.addEventListener('click', () => {
            document.getElementById('addVideoModal').style.display = 'none';
        });
        console.log('Close add video modal listener added');
    } else {
        console.error('Close add video modal button not found');
    }
    
    const addVideoModalForm = document.getElementById('addVideoModalForm');
    if (addVideoModalForm) {
        addVideoModalForm.addEventListener('submit', addVideoFromModal);
        console.log('Add video modal form listener added');
    } else {
        console.error('Add video modal form not found');
    }
    
    // Room settings (leader only)
    if (isLeader) {
        setupLeaderControls();
    }
    
    // Window beforeunload
    window.addEventListener('beforeunload', () => {
        leaveRoom();
    });
    
    console.log('Room event listeners setup completed');
}

// Setup leader controls
function setupLeaderControls() {
    console.log('Setting up leader controls...');
    
    // Show settings button for leaders
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.style.display = 'inline-block';
        settingsBtn.addEventListener('click', showRoomSettings);
        console.log('Settings button listener added');
    } else {
        console.error('Settings button not found');
    }
    
    // Modal events for leader
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            document.getElementById('roomSettingsModal').style.display = 'none';
        });
        console.log('Close settings modal listener added');
    } else {
        console.error('Close settings modal button not found');
    }
    
    const closeKickModal = document.getElementById('closeKickModal');
    if (closeKickModal) {
        closeKickModal.addEventListener('click', () => {
            document.getElementById('kickUserModal').style.display = 'none';
        });
        console.log('Close kick modal listener added');
    } else {
        console.error('Close kick modal button not found');
    }
    
    const roomSettingsForm = document.getElementById('roomSettingsForm');
    if (roomSettingsForm) {
        roomSettingsForm.addEventListener('submit', handleRoomSettings);
        console.log('Room settings form listener added');
    } else {
        console.error('Room settings form not found');
    }
    
    const kickUserForm = document.getElementById('kickUserForm');
    if (kickUserForm) {
        kickUserForm.addEventListener('submit', handleKickUser);
        console.log('Kick user form listener added');
    } else {
        console.error('Kick user form not found');
    }
    
    console.log('Leader controls setup completed');
}

// Initialize YouTube player
function initializeYouTubePlayer() {
    // Check if YouTube API is already loaded
    if (typeof YT !== 'undefined' && YT.Player) {
        createPlayer();
    } else {
        // YouTube API will call this function when ready
        window.onYouTubeIframeAPIReady = function() {
            createPlayer();
        };
    }
}

function createPlayer() {
    // Create player with conditional controls based on permissions
    const hasPlayPausePermission = hasPermission('playPause');
    const hasSeekPermission = hasPermission('videoSeek');
    
    youtubePlayer = new YT.Player('youtubePlayer', {
        height: '400',
        width: '100%',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 1, // Enable built-in controls to show timeline
            'modestbranding': 1,
            'rel': 0,
            'enablejsapi': 1,
            'disablekb': 0, // Enable keyboard for timeline interaction
            'fs': 0, // Disable fullscreen button
            'iv_load_policy': 3, // Disable annotations
            'cc_load_policy': 0, // Disable captions
            'autoplay': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
    
    // Add overlay to prevent interactions if no permissions
    updateVideoOverlay();
}

// YouTube player events
function onPlayerReady(event) {
    console.log('YouTube player ready');
    
    // Debug: Check player dimensions
    const playerElement = document.getElementById('youtubePlayer');
    if (playerElement) {
        console.log('Player element dimensions:', {
            width: playerElement.offsetWidth,
            height: playerElement.offsetHeight,
            style: playerElement.style.cssText
        });
        
        // Ensure player fits container properly
        playerElement.style.overflow = 'visible';
        
        // Enable iframe interaction for timeline
        const iframe = playerElement.querySelector('iframe');
        if (iframe) {
            console.log('Found YouTube iframe, enabling interaction for timeline');
            iframe.style.pointerEvents = 'auto';
        }
    }
    
    // Add seeking listener for users with play/pause permission (same as timeline seeking)
    if (hasPermission('playPause')) {
        addSeekingListener();
    }
    
    // Load first video if available
    if (currentRoom.playlist && currentRoom.playlist.length > 0) {
        loadVideo(0);
    } else {
        // Clear video player if playlist is empty
        youtubePlayer.stopVideo();
        currentVideoIndex = -1;
        showBlankVideoState();
        updatePlaylistDisplay();
    }
    
    // Update overlay based on current permissions
    updateVideoOverlay();
}

// Update video overlay based on permissions
function updateVideoOverlay() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;
    
    // Remove existing overlay
    const existingOverlay = videoContainer.querySelector('.video-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Only show overlay if there are videos AND user has no play/pause permission
    if (currentRoom.playlist && currentRoom.playlist.length > 0 && 
        !hasPermission('playPause')) {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        overlay.innerHTML = `
            <div class="overlay-message">
                <i class="fas fa-lock"></i>
                <p>Nincs jogosultság a videó vezérléséhez</p>
            </div>
        `;
        videoContainer.appendChild(overlay);
        
        // Disable the YouTube iframe only for users without permissions
        const iframe = videoContainer.querySelector('iframe');
        if (iframe) {
            iframe.style.pointerEvents = 'none';
        }
    } else {
        // Always enable iframe for timeline interaction if user has permissions
        const iframe = videoContainer.querySelector('iframe');
        if (iframe) {
            iframe.style.pointerEvents = 'auto';
        }
    }
}

// Refresh all UI elements based on current permissions
function refreshPermissionsUI() {
    console.log('Refreshing permissions UI...');
    
    // Update video overlay
    updateVideoOverlay();
    
    // Update video controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        if (hasPermission('playPause')) {
            playPauseBtn.disabled = false;
            playPauseBtn.classList.add('btn-enabled');
            playPauseBtn.classList.remove('btn-disabled');
            playPauseBtn.title = 'Play/Pause';
        } else {
            playPauseBtn.disabled = true;
            playPauseBtn.classList.add('btn-disabled');
            playPauseBtn.classList.remove('btn-enabled');
            playPauseBtn.title = 'No permission to play/pause';
        }
    }
    
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        if (hasPermission('playPause')) {
            skipBtn.disabled = false;
            skipBtn.classList.add('btn-enabled');
            skipBtn.classList.remove('btn-disabled');
            skipBtn.title = 'Skip to next video';
        } else {
            skipBtn.disabled = true;
            skipBtn.classList.add('btn-disabled');
            skipBtn.classList.remove('btn-enabled');
            skipBtn.title = 'No permission to skip videos';
        }
    }
    
    const addVideoBtn = document.getElementById('addVideoBtn');
    if (addVideoBtn) {
        if (hasPermission('addVideo')) {
            addVideoBtn.disabled = false;
            addVideoBtn.classList.add('btn-enabled');
            addVideoBtn.classList.remove('btn-disabled');
            addVideoBtn.title = 'Add video to playlist';
        } else {
            addVideoBtn.disabled = true;
            addVideoBtn.classList.add('btn-disabled');
            addVideoBtn.classList.remove('btn-enabled');
            addVideoBtn.title = 'No permission to add videos';
        }
    }
    
    // Update all playlist action buttons
    const removeButtons = document.querySelectorAll('.remove-video-btn');
    removeButtons.forEach(btn => {
        if (hasPermission('removeVideo')) {
            btn.disabled = false;
            btn.classList.add('btn-enabled');
            btn.classList.remove('btn-disabled');
            btn.title = 'Remove video';
        } else {
            btn.disabled = true;
            btn.classList.add('btn-disabled');
            btn.classList.remove('btn-enabled');
            btn.title = 'No permission to remove videos';
        }
    });
    
    // Update playlist items for drag/drop
    const playlistItems = document.querySelectorAll('.playlist-item');
    playlistItems.forEach(item => {
        if (hasPermission('editPlaylist')) {
            item.draggable = true;
        } else {
            item.draggable = false;
        }
    });
    
    // Update playlist display
    updatePlaylistDisplay();
    
    console.log('Permissions UI refreshed');
}

// Add seeking listener for video timeline interaction
function addSeekingListener() {
    if (!youtubePlayer) return;
    
    // Listen for seeking events from the YouTube player
    let seekingTimeout;
    let lastSeekTime = 0;
    
    // Check for seeking every 500ms
    setInterval(() => {
        if (!youtubePlayer || !hasPermission('videoSeek')) return;
        
        try {
            const currentTime = youtubePlayer.getCurrentTime();
            const now = Date.now();
            
            // Only sync if enough time has passed since last seek (prevent spam)
            if (now - lastSeekTime > 1000) {
                syncVideoTime(currentTime);
                lastSeekTime = now;
            }
        } catch (error) {
            // Silent error for seeking sync
        }
    }, 500);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // Auto-play next video
        playNextVideo();
    } else if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseButton();
        
        // Only sync if user has permission AND this wasn't triggered by sync
        if (hasPermission('playPause') && !window.isSyncing) {
            // Small delay to ensure the state change is complete
            setTimeout(() => {
                syncVideoState('playing');
            }, 100);
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayPauseButton();
        
        // Only sync if user has permission AND this wasn't triggered by sync
        if (hasPermission('playPause') && !window.isSyncing) {
            // Small delay to ensure the state change is complete
            setTimeout(() => {
                syncVideoState('paused');
            }, 100);
        }
    }
}



// Global flags to prevent sync during auto-playback and unauthorized actions
let isAutoPlaying = false;
let isProcessingVideoAction = false;

// Reliable sync system that works every time
function startVideoSync() {
    let lastVideoState = null;
    let lastVideoTime = null;
    let lastVideoIndex = null;
    let lastPermissions = null;
    
    // Check for updates every 200ms for very responsive sync
    setInterval(async () => {
        if (!currentRoom || !currentRoom.id || !youtubePlayer) return;
        
        try {
            const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}`));
            if (response.ok) {
                const updatedRoom = await response.json();
                const now = Date.now();
                
                // Check for permission changes and refresh UI
                if (updatedRoom.permissions && JSON.stringify(updatedRoom.permissions) !== JSON.stringify(lastPermissions)) {
                    lastPermissions = updatedRoom.permissions;
                    currentRoom.permissions = updatedRoom.permissions;
                    console.log('Permissions changed, refreshing UI...');
                    refreshPermissionsUI();
                }
                
                // Check for playlist changes and update overlay
                if (updatedRoom.playlist && JSON.stringify(updatedRoom.playlist) !== JSON.stringify(currentRoom.playlist) && !isAddingVideo) {
                    currentRoom.playlist = updatedRoom.playlist;
                    console.log('Playlist changed, updating overlay...');
                    updatePlaylistDisplay();
                    
                    // Immediately update overlay for all users when playlist changes
                    setTimeout(() => {
                        updateVideoOverlay();
                        console.log('Overlay updated after playlist change');
                    }, 100);
                }
                
                // Check for participant changes and update display
                if (updatedRoom.participants && JSON.stringify(updatedRoom.participants) !== JSON.stringify(currentRoom.participants)) {
                    currentRoom.participants = updatedRoom.participants;
                    console.log('Participants changed, updating display...');
                    updateParticipantsDisplay();
                }
                
                // Handle video index changes (new video)
                if (updatedRoom.currentVideoIndex !== undefined && updatedRoom.currentVideoIndex !== lastVideoIndex) {
                    lastVideoIndex = updatedRoom.currentVideoIndex;
                    
                    // Handle empty playlist
                    if (!updatedRoom.playlist || updatedRoom.playlist.length === 0) {
                        console.log('Syncing: Playlist is empty, clearing video');
                        currentVideoIndex = -1;
                        
                        // Completely stop and clear the video for all users
                        if (youtubePlayer) {
                            try {
                                youtubePlayer.stopVideo();
                                youtubePlayer.loadVideoById('');
                                youtubePlayer.pauseVideo();
                            } catch (error) {
                                console.log('Error stopping video:', error);
                            }
                        }
                        
                        // Hide YouTube player and show blank state
                        const youtubePlayerDiv = document.getElementById('youtubePlayer');
                        if (youtubePlayerDiv) {
                            youtubePlayerDiv.style.display = 'none';
                        }
                        
                        showBlankVideoState();
                        updatePlaylistDisplay();
                        updateVideoOverlay(); // Update overlay since no videos exist
                        return;
                    }
                    
                    // Handle valid video index
                    if (updatedRoom.playlist[updatedRoom.currentVideoIndex]) {
                        console.log('Syncing: Load video', updatedRoom.currentVideoIndex);
                        // Don't set isAutoPlaying here since loadVideo will handle it
                        loadVideo(updatedRoom.currentVideoIndex);
                        
                        // Update overlay after video loads
                        setTimeout(() => {
                            updateVideoOverlay();
                            console.log('Overlay updated after video load');
                        }, 500);
                        
                        return; // Don't sync other things when loading new video
                    }
                }
                
                // Skip sync during auto-playback, syncing, or skip operations
                if (isAutoPlaying || window.isSyncing || isSkipOperation) {
                    console.log('Skipping sync - protection active (auto-playing:', isAutoPlaying, 'syncing:', window.isSyncing, 'skip:', isSkipOperation, ')');
                    return;
                }
                
                // Handle video state changes (play/pause) - with better error handling
                if (updatedRoom.videoState && updatedRoom.lastUpdateTime) {
                    const timeDiff = now - updatedRoom.lastUpdateTime;
                    const stateChanged = updatedRoom.videoState !== lastVideoState;
                    
                    // Sync if update is recent and state changed, but not during protection periods
                    if (timeDiff < 2000 && stateChanged && !isAutoPlaying && !window.isSyncing && !isSkipOperation) {
                        lastVideoState = updatedRoom.videoState;
                        
                        if (youtubePlayer && youtubePlayer.getPlayerState) {
                            try {
                                const currentState = youtubePlayer.getPlayerState();
                                
                                if (updatedRoom.videoState === 'playing' && currentState !== YT.PlayerState.PLAYING) {
                                    console.log('Syncing: Play video');
                                    window.isSyncing = true;
                                    youtubePlayer.playVideo();
                                    setTimeout(() => { window.isSyncing = false; }, 500);
                                } else if (updatedRoom.videoState === 'paused' && currentState === YT.PlayerState.PLAYING) {
                                    console.log('Syncing: Pause video');
                                    window.isSyncing = true;
                                    youtubePlayer.pauseVideo();
                                    setTimeout(() => { window.isSyncing = false; }, 500);
                                } else if (updatedRoom.videoState === 'stopped') {
                                    console.log('Syncing: Stop video');
                                    window.isSyncing = true;
                                    youtubePlayer.stopVideo();
                                    youtubePlayer.loadVideoById('');
                                    setTimeout(() => { window.isSyncing = false; }, 500);
                                }
                            } catch (error) {
                                console.error('Error syncing video state:', error);
                                window.isSyncing = false;
                            }
                        }
                    }
                }
                
                // Handle video time changes (seeking) - simplified and more reliable
                if (updatedRoom.videoTime && updatedRoom.lastUpdateTime) {
                    const timeDiff = now - updatedRoom.lastUpdateTime;
                    const timeChanged = updatedRoom.videoTime !== lastVideoTime;
                    
                    // Only sync recent manual seeking (not automatic playback) and not during protection
                    if (timeDiff < 1500 && timeChanged && !isAutoPlaying && !window.isSyncing && !isSkipOperation) {
                        lastVideoTime = updatedRoom.videoTime;
                        
                        if (youtubePlayer && youtubePlayer.getCurrentTime) {
                            try {
                                const currentTime = youtubePlayer.getCurrentTime();
                                const targetTime = updatedRoom.videoTime;
                                
                                // Only sync for significant time differences (manual seeking)
                                if (Math.abs(currentTime - targetTime) > 1.5) {
                                    console.log('Syncing manual seek to', targetTime, 'from', currentTime, 'User:', isLeader ? 'Leader' : 'Member');
                                    
                                    window.isSyncing = true;
                                    
                                    // Get current state before seeking
                                    const currentState = youtubePlayer.getPlayerState();
                                    const wasPlaying = currentState === YT.PlayerState.PLAYING;
                                    
                                    // Perform the seek
                                    youtubePlayer.seekTo(targetTime, true);
                                    
                                    // Resume playing if it was playing before (with better error handling)
                                    if (wasPlaying) {
                                        setTimeout(() => {
                                            try {
                                                if (youtubePlayer && youtubePlayer.playVideo) {
                                                    youtubePlayer.playVideo();
                                                }
                                            } catch (e) {
                                                console.log('Error resuming video after seek:', e);
                                            }
                                        }, 300);
                                    }
                                    
                                    setTimeout(() => { 
                                        window.isSyncing = false; 
                                    }, 1500);
                                }
                            } catch (error) {
                                console.error('Error during seeking sync:', error);
                                window.isSyncing = false;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Silent error for video sync
        }
    }, 200); // Check every 200ms for very responsive sync
}

// Sync video state to other participants (anyone with permission)
async function syncVideoState(state) {
    try {
        // Prevent multiple simultaneous syncs
        if (isProcessingVideoAction) {
            console.log('Video action already in progress, skipping sync');
            return;
        }
        
        isProcessingVideoAction = true;
        
        console.log('Syncing video state to server:', state, 'User:', isLeader ? 'Leader' : 'Member');
        
        // Update local state immediately
        currentRoom.videoState = state;
        currentRoom.lastUpdateTime = Date.now();
        
        // Send to server immediately
        const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                videoState: state,
                lastUpdateTime: Date.now()
            })
        });
        
        if (response.ok) {
            console.log('Video state synced successfully to server');
        } else {
            console.error('Failed to sync video state to server');
        }
    } catch (error) {
        console.error('Error syncing video state:', error);
    } finally {
        // Reset flag after a delay
        setTimeout(() => {
            isProcessingVideoAction = false;
        }, 1000);
    }
}

// Sync video time (seeking) to other participants
async function syncVideoTime(time) {
    try {
        console.log('Syncing video time to server:', time, 'User:', isLeader ? 'Leader' : 'Member');
        
        // Update local state immediately
        currentRoom.videoTime = time;
        currentRoom.lastUpdateTime = Date.now();
        
        // Send to server immediately
        const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                videoTime: time,
                lastUpdateTime: Date.now()
            })
        });
        
        if (response.ok) {
            console.log('Video time synced successfully to server');
        } else {
            console.error('Failed to sync video time to server');
        }
    } catch (error) {
        console.error('Error syncing video time:', error);
    }
}

function onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    // Skip to next video on error
    playNextVideo();
}

// Update room UI
function updateRoomUI() {
    document.getElementById('roomName').textContent = currentRoom.name;
    document.getElementById('participantCount').textContent = `${currentRoom.participants.length} participants`;
    document.getElementById('playlistCount').textContent = `${currentRoom.playlist.length} videos`;
    
    // Show/hide settings button for leaders
    const settingsBtn = document.getElementById('settingsBtn');
    if (isLeader) {
        settingsBtn.style.display = 'inline-block';
    } else {
        settingsBtn.style.display = 'none';
    }
    
    // Update video controls based on permissions
    const playPauseBtn = document.getElementById('playPauseBtn');
    const skipBtn = document.getElementById('skipBtn');
    const addVideoBtn = document.getElementById('addVideoBtn');
    
    console.log('Found buttons:', { playPauseBtn: !!playPauseBtn, skipBtn: !!skipBtn, addVideoBtn: !!addVideoBtn });
    
    // Play/Pause and Skip permissions
    if (playPauseBtn && skipBtn) {
        if (!hasPermission('playPause')) {
            playPauseBtn.disabled = true;
            playPauseBtn.title = 'You do not have permission to control playback';
            skipBtn.disabled = true;
            skipBtn.title = 'You do not have permission to skip videos';
            
            playPauseBtn.classList.add('btn-disabled');
            skipBtn.classList.add('btn-disabled');
            playPauseBtn.classList.remove('btn-enabled');
            skipBtn.classList.remove('btn-enabled');
        } else {
            playPauseBtn.disabled = false;
            playPauseBtn.title = 'Play/Pause';
            skipBtn.disabled = false;
            skipBtn.title = 'Skip to next video';
            
            playPauseBtn.classList.remove('btn-disabled');
            skipBtn.classList.remove('btn-disabled');
            playPauseBtn.classList.add('btn-enabled');
            skipBtn.classList.add('btn-enabled');
        }
    } else {
        console.warn('Play/pause or skip buttons not found');
    }
    
    // Add video permission
    if (addVideoBtn) {
        if (!hasPermission('addVideo')) {
            addVideoBtn.disabled = true;
            addVideoBtn.title = 'You do not have permission to add videos';
            addVideoBtn.classList.add('disabled');
        } else {
            addVideoBtn.disabled = false;
            addVideoBtn.title = 'Add Video';
            addVideoBtn.classList.remove('disabled');
        }
    } else {
        console.warn('Add video button not found');
    }
    

    

}







// Enhanced seeking system for users with permission - works with YouTube's built-in timeline
function addSeekingListener() {
    if (!youtubePlayer) return;
    
    const playerElement = document.getElementById('youtubePlayer');
    if (playerElement) {
        let lastSeekTime = 0;
        let lastSeekCheck = 0;
        let isUserSeeking = false;
        
        // More reliable seeking detection with better error handling
        const checkForSeeking = () => {
            try {
                if (!youtubePlayer || !hasPermission('playPause') || !youtubePlayer.getCurrentTime) return;
                
                const currentTime = youtubePlayer.getCurrentTime();
                const now = Date.now();
                
                // Only detect seeking during actual user interactions, not automatic playback
                if (currentTime && currentTime > 0 && !window.isSyncing && !isAutoPlaying && !isUserSeeking) {
                    // Detect time changes that indicate manual seeking
                    const timeDiff = Math.abs(currentTime - lastSeekTime);
                    const timeSinceLastCheck = now - lastSeekCheck;
                    
                    if (timeDiff > 1.5 && timeSinceLastCheck > 300) {
                        console.log('Manual seeking detected to:', currentTime, 'diff:', timeDiff, 'User:', isLeader ? 'Leader' : 'Member');
                        isUserSeeking = true;
                        syncVideoTime(currentTime);
                        lastSeekTime = currentTime;
                        lastSeekCheck = now;
                        
                        // Reset flag after a delay to prevent multiple triggers
                        setTimeout(() => {
                            isUserSeeking = false;
                        }, 2000);
                    }
                }
            } catch (error) {
                console.error('Error in seeking detection:', error);
                isUserSeeking = false;
            }
        };
        
        // Check for seeking more frequently for better detection
        setInterval(checkForSeeking, 100);
        
        // Listen for seeking events (progress bar clicks)
        playerElement.addEventListener('click', (e) => {
            if (hasPermission('playPause')) {
                const rect = playerElement.getBoundingClientRect();
                // Only trigger if click is in the bottom area (progress bar)
                if (e.clientY > rect.bottom - 60) {
                    setTimeout(() => {
                        const newTime = youtubePlayer.getCurrentTime();
                        if (newTime && newTime > 0) {
                            console.log('Timeline click seeking to:', newTime, 'User:', isLeader ? 'Leader' : 'Member');
                            syncVideoTime(newTime);
                        }
                    }, 100);
                }
            }
        });
        
        // Listen for keyboard seeking (arrow keys, etc.)
        document.addEventListener('keydown', (e) => {
            if (hasPermission('playPause') && document.activeElement === playerElement) {
                const seekingKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
                if (seekingKeys.includes(e.key)) {
                    setTimeout(() => {
                        const newTime = youtubePlayer.getCurrentTime();
                        if (newTime && newTime > 0) {
                            console.log('Keyboard seeking to:', newTime, 'User:', isLeader ? 'Leader' : 'Member');
                            syncVideoTime(newTime);
                        }
                    }, 100);
                }
            }
        });
        
        // Listen for YouTube's state change events to detect seeking
        if (youtubePlayer.addEventListener) {
            youtubePlayer.addEventListener('onStateChange', (event) => {
                // State 1 = playing, State 2 = paused, State 3 = buffering
                if (event.data === 1 || event.data === 2) {
                    if (hasPermission('playPause') && !window.isSyncing && !isAutoPlaying && !isUserSeeking) {
                        const currentTime = youtubePlayer.getCurrentTime();
                        if (currentTime && currentTime > 0) {
                            // Check for significant time change (manual seeking)
                            const timeDiff = Math.abs(currentTime - lastSeekTime);
                            if (timeDiff > 2) {
                                console.log('State change seeking detected to:', currentTime, 'User:', isLeader ? 'Leader' : 'Member');
                                syncVideoTime(currentTime);
                                lastSeekTime = currentTime;
                            }
                        }
                    }
                }
            });
        }
    }
}

// Show permission message
function showPermissionMessage(message) {
    // Create temporary message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 107, 107, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}



// Update playlist display
function updatePlaylistDisplay() {
    const container = document.getElementById('playlistContainer');
    
    if (!container) {
        console.warn('Playlist container not found');
        return;
    }
    
    if (currentRoom.playlist.length === 0) {
        container.innerHTML = `
            <div class="empty-playlist">
                <i class="fas fa-music"></i>
                <p>Nincs videó a lejátszási listában</p>
                <p>Add hozzá az első videódat a kezdéshez!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentRoom.playlist.map((video, index) => `
                        <div class="playlist-item ${index === currentVideoIndex ? 'current' : ''}" 
             data-video-id="${video.id}" draggable="${hasPermission('editPlaylist')}">
            <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-uploader">${video.uploader}</div>
            </div>
            <div class="video-actions">
                ${hasPermission('playPause') ? `
                    <button onclick="playVideo(${index})" title="Lejátszás" class="btn-enabled">
                        <i class="fas fa-play"></i>
                    </button>
                ` : `
                    <button disabled title="Nincs jogosultság a lejátszás/szüneteléshez" class="btn-disabled">
                        <i class="fas fa-play"></i>
                    </button>
                `}
                ${hasPermission('removeVideo') ? `
                    <button onclick="removeVideo('${video.id}')" title="Eltávolítás" class="btn-danger btn-enabled">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button disabled title="Nincs jogosultság a videók eltávolításához" class="btn-danger btn-disabled">
                        <i class="fas fa-trash"></i>
                    </button>
                `}
            </div>
        </div>
    `).join('');
    
    // Setup drag and drop
    setupDragAndDrop();
}

// Setup drag and drop for playlist
function setupDragAndDrop() {
    const videoItems = document.querySelectorAll('.playlist-item');
    const container = document.getElementById('playlistContainer');
    
    if (!container) {
        console.warn('Playlist container not found for drag and drop setup');
        return;
    }
    
    videoItems.forEach(item => {
        // Only enable drag if user has permission
        if (hasPermission('editPlaylist')) {
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        } else {
            item.draggable = false;
        }
    });
    
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.videoId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const container = document.getElementById('playlistContainer');
    const draggingItem = document.querySelector('.dragging');
    if (draggingItem) {
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement) {
            container.insertBefore(draggingItem, afterElement);
        } else {
            container.appendChild(draggingItem);
        }
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.video-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDrop(e) {
    e.preventDefault();
    
    // Check if user has permission to edit playlist
    if (!hasPermission('editPlaylist')) {
        alert('Nincs jogosultságod a lejátszási lista átrendezéséhez');
        return;
    }
    
    const container = document.getElementById('playlistContainer');
    const videoId = e.dataTransfer.getData('text/plain');
            const newOrder = Array.from(container.querySelectorAll('.playlist-item')).map(item => item.dataset.videoId);
    
    console.log('Reordering playlist:', { videoId, newOrder });
    
    // Reorder playlist
    const videoIndex = currentRoom.playlist.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        const video = currentRoom.playlist.splice(videoIndex, 1)[0];
        const newIndex = newOrder.indexOf(videoId);
        currentRoom.playlist.splice(newIndex, 0, video);
        
        // Update current video index
        if (currentVideoIndex === videoIndex) {
            currentVideoIndex = newIndex;
        } else if (currentVideoIndex > videoIndex && currentVideoIndex <= newIndex) {
            currentVideoIndex--;
        } else if (currentVideoIndex < videoIndex && currentVideoIndex >= newIndex) {
            currentVideoIndex++;
        }
        
        console.log('Playlist reordered successfully');
        
        // Save changes
        saveRoomChanges();
        updatePlaylistDisplay();
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.video-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update participants display
function updateParticipantsDisplay() {
    console.log('=== UPDATING PARTICIPANTS DISPLAY ===');
    console.log('Current room:', currentRoom);
    console.log('Current room participants:', currentRoom?.participants);
    
    const container = document.getElementById('participantsList');
    
    if (!container) {
        console.warn('Participants list container not found');
        return;
    }
    
    if (!currentRoom || !currentRoom.participants) {
        console.log('No room or participants data, showing empty state');
        container.innerHTML = '<div class="no-participants">Nincs résztvevő</div>';
        return;
    }
    
    container.innerHTML = currentRoom.participants.map(participant => {
        const isCurrentUser = participant.id === currentUser;
        const isRoomLeader = participant.id === currentRoom.leader;
        const canKick = (isLeader || hasPermission('kickMembers')) && !isRoomLeader && !isCurrentUser;
        
        return `
            <div class="participant-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="participant-info">
                    <div class="participant-avatar">${participant.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="participant-name">${participant.username}${isCurrentUser ? ' (Te)' : ''}</div>
                        <div class="participant-role">${isRoomLeader ? 'Vezető' : 'Tag'}</div>
                    </div>
                </div>
                ${canKick ? `
                    <div class="participant-actions">
                        <button onclick="kickUser('${participant.id}')" class="btn-danger" title="Kirúgás">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    console.log('Participants display updated with', currentRoom.participants.length, 'participants');
}

// Video control functions
function togglePlayPause() {
    if (!youtubePlayer) return;
    
    // Check if user has permission to control playback
    if (!hasPermission('playPause')) {
        return;
    }
    
    if (isPlaying) {
        youtubePlayer.pauseVideo();
    } else {
        youtubePlayer.playVideo();
    }
}

function skipVideo() {
    // Check if user has permission to control playback
    if (!hasPermission('playPause')) {
        return;
    }
    
    console.log('Skip video requested by user');
    
    // Handle empty playlist
    if (currentRoom.playlist.length === 0) {
        console.log('Playlist is empty, cannot skip');
        return;
    }
    
    // Calculate next video index
    let nextIndex;
    if (currentVideoIndex < currentRoom.playlist.length - 1) {
        nextIndex = currentVideoIndex + 1;
    } else {
        // Loop back to first video
        nextIndex = 0;
    }
    
    console.log(`Skipping from video ${currentVideoIndex} to ${nextIndex}`);
    
    // Set strong protection flags to prevent any interference
    isAutoPlaying = true;
    window.isSyncing = true;
    isSkipOperation = true;
    
    // Update server with new video index
    try {
        fetch(`${window.location.origin}/api/rooms/${currentRoom.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                currentVideoIndex: nextIndex,
                lastUpdateTime: Date.now()
            })
        });
    } catch (error) {
        console.error('Error updating video index on server:', error);
    }
    
    // Load the next video locally
    loadVideo(nextIndex);
    
    // Clear protection flags after a longer delay to ensure video is stable
    setTimeout(() => {
        window.isSyncing = false;
        console.log('Sync protection cleared after skip');
    }, 4000);
    
    setTimeout(() => {
        isAutoPlaying = false;
        console.log('Auto-playing protection cleared after skip');
    }, 5000);
    
    setTimeout(() => {
        isSkipOperation = false;
        console.log('Skip operation protection cleared');
    }, 6000);
}



function changeVolume() {
    if (!youtubePlayer) return;
    const volume = document.getElementById('volumeSlider').value;
    youtubePlayer.setVolume(volume);
}

function updatePlayPauseButton() {
    const btn = document.getElementById('playPauseBtn');
    const icon = btn.querySelector('i');
    const text = btn.textContent.replace(icon.outerHTML, '').trim();
    
    if (isPlaying) {
        icon.className = 'fas fa-pause';
        btn.innerHTML = icon.outerHTML + ' Szünet';
    } else {
        icon.className = 'fas fa-play';
        btn.innerHTML = icon.outerHTML + ' Lejátszás';
    }
}

// Playlist functions
function showAddVideoForm() {
    document.getElementById('addVideoForm').style.display = 'block';
    document.getElementById('videoUrl').focus();
}

function hideAddVideoForm() {
    document.getElementById('addVideoForm').style.display = 'none';
    document.getElementById('videoUrl').value = '';
}

function addVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    if (!url) return;
    
    // Check if user has permission to add videos
    if (!hasPermission('addVideo')) {
        return;
    }
    
    addVideoFromURL(url);
    hideAddVideoForm();
}

function addVideoFromModal(e) {
    e.preventDefault();
    const url = document.getElementById('modalVideoUrl').value.trim();
    if (!url) {
        return;
    }
    
    // Check if user has permission to add videos
    if (!hasPermission('addVideo')) {
        return;
    }
    
    console.log('Adding video with URL:', url);
    console.log('Current permissions:', currentRoom.permissions);
    console.log('User is leader:', isLeader);
    console.log('Has addVideo permission:', hasPermission('addVideo'));
    
    addVideoFromURL(url);
    document.getElementById('addVideoModal').style.display = 'none';
    document.getElementById('modalVideoUrl').value = '';
}

async function addVideoFromURL(url) {
    try {
        console.log('=== STARTING VIDEO/PLAYLIST ADDITION ===');
        console.log('URL:', url);
        console.log('Current playlist length:', currentRoom.playlist.length);
        console.log('Current permissions:', currentRoom.permissions);
        console.log('Has addVideo permission:', hasPermission('addVideo'));
        
        // Check if it's a playlist URL
        const playlistId = extractYouTubePlaylistId(url);
        if (playlistId) {
            console.log('Detected playlist URL, playlist ID:', playlistId);
            await addPlaylistFromURL(url, playlistId);
            return;
        }
        
        // Handle single video
        let videoId = extractYouTubeVideoId(url);
        console.log('Extracted video ID:', videoId);
        
        if (!videoId) {
            console.error('Invalid YouTube URL');
            return;
        }
        
        const existingVideo = currentRoom.playlist.find(v => v.id === videoId);
        if (existingVideo) {
            console.warn('This video is already in the playlist');
            return;
        }
        
        console.log('Video ID is valid and not duplicate, creating temp video...');
        
        // Create a temporary video object for immediate display
        const tempVideo = {
            id: videoId,
            title: 'Loading...',
            uploader: 'Loading...',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            url: url
        };
        
        console.log('Adding temp video to playlist:', tempVideo);
        
        // Add to playlist immediately for instant feedback
        isAddingVideo = true; // Set flag to prevent sync conflicts
        currentRoom.playlist.push(tempVideo);
        console.log('Current playlist length:', currentRoom.playlist.length);
        updatePlaylistDisplay();
        
        // Set a timeout to clear the flag in case of issues
        setTimeout(() => {
            console.log('Clearing isAddingVideo flag due to timeout');
            isAddingVideo = false;
        }, 10000); // 10 seconds timeout
        
        // Get video metadata from server
        let metadata;
        try {
            const response = await fetch(getApiUrl('/video/metadata'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get video metadata: ${errorText}`);
            }
            
            metadata = await response.json();
        } catch (error) {
            console.warn('Server metadata fetch failed, using fallback:', error);
            // Fallback metadata
            metadata = {
                video_id: videoId,
                title: `Video ${videoId}`,
                uploader: 'Unknown Channel',
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            };
        }
        
        // Update the video with real metadata
        const videoIndex = currentRoom.playlist.length - 1;
        console.log('Updating video at index:', videoIndex, 'with metadata:', metadata);
        console.log('Uploader from metadata:', metadata.uploader);
        currentRoom.playlist[videoIndex] = {
            id: metadata.video_id,
            title: metadata.title,
            uploader: metadata.uploader,
            thumbnail: metadata.thumbnail,
            url: url
        };
        console.log('Updated video object:', currentRoom.playlist[videoIndex]);
        
        // Update display with real metadata
        updatePlaylistDisplay();
        
        // Update overlay since videos now exist
        updateVideoOverlay();
        
        // Update server with complete playlist
        try {
            const serverResponse = await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    playlist: currentRoom.playlist,
                    lastUpdateTime: Date.now()
                })
            });
            
            if (!serverResponse.ok) {
                throw new Error('Failed to update server playlist');
            }
            
            console.log('Video successfully added to server playlist');
        } catch (error) {
            console.warn('Server update failed, using localStorage fallback:', error);
            // Fallback to localStorage
            const rooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
            const roomIndex = rooms.findIndex(r => r.id === currentRoom.id);
            if (roomIndex !== -1) {
                rooms[roomIndex] = currentRoom;
                localStorage.setItem('youtubeRooms', JSON.stringify(rooms));
            }
        }
        
        // Auto-play if it's the first video
        if (currentRoom.playlist.length === 1 && youtubePlayer) {
            loadVideo(0);
        }
        
        // Always update overlay since videos now exist
        updateVideoOverlay();
        
        console.log('=== VIDEO ADDITION COMPLETED SUCCESSFULLY ===');
        console.log('Final playlist length:', currentRoom.playlist.length);
        console.log('Video added successfully:', metadata.title);
        isAddingVideo = false; // Clear flag after successful addition
        
        // Force a permissions refresh to ensure buttons are updated
        setTimeout(() => {
            refreshPermissionsUI();
        }, 100);
    } catch (error) {
        console.error('Error adding video:', error);
        
        // Remove the temporary video if there was an error
        if (videoId) {
            const videoIndex = currentRoom.playlist.findIndex(v => v.id === videoId);
            if (videoIndex !== -1 && currentRoom.playlist[videoIndex].title === 'Loading...') {
                currentRoom.playlist.splice(videoIndex, 1);
                updatePlaylistDisplay();
            }
        }
        
        console.error('Error adding video. Please try again.');
        isAddingVideo = false; // Clear flag on error
    }
}

function extractYouTubeVideoId(url) {
    console.log('Extracting video ID from URL:', url);
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;
    console.log('Extracted video ID:', videoId);
    return videoId;
}

function extractYouTubePlaylistId(url) {
    console.log('Extracting playlist ID from URL:', url);
    const regex = /(?:youtube\.com\/playlist\?list=|youtube\.com\/watch\?.*&list=)([^"&?\/\s]{34})/;
    const match = url.match(regex);
    const playlistId = match ? match[1] : null;
    console.log('Extracted playlist ID:', playlistId);
    return playlistId;
}

async function addPlaylistFromURL(url, playlistId) {
    try {
        console.log('=== STARTING PLAYLIST IMPORT ===');
        console.log('Playlist URL:', url);
        console.log('Playlist ID:', playlistId);
        
        // Set flag to prevent sync conflicts during playlist import
        isAddingVideo = true;
        
        // Get playlist metadata and videos from server
        let playlistData;
        try {
            const response = await fetch(getApiUrl('/playlist/metadata'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, playlistId })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get playlist metadata: ${errorText}`);
            }
            
            playlistData = await response.json();
            console.log('Playlist data received:', playlistData);
        } catch (error) {
            console.error('Server playlist fetch failed:', error);
            throw new Error('Failed to fetch playlist data from server');
        }
        
        if (!playlistData || !playlistData.videos || playlistData.videos.length === 0) {
            throw new Error('No videos found in playlist');
        }
        
        console.log(`Found ${playlistData.videos.length} videos in playlist`);
        
        // Add each video from the playlist
        let addedCount = 0;
        let skippedCount = 0;
        
        for (let i = 0; i < playlistData.videos.length; i++) {
            const video = playlistData.videos[i];
            
            // Check if video already exists in playlist
            const existingVideo = currentRoom.playlist.find(v => v.id === video.video_id);
            if (existingVideo) {
                console.log(`Skipping duplicate video: ${video.title}`);
                skippedCount++;
                continue;
            }
            
            // Add video to playlist
            const videoObject = {
                id: video.video_id,
                title: video.title,
                uploader: video.uploader,
                thumbnail: video.thumbnail,
                url: `https://www.youtube.com/watch?v=${video.video_id}`
            };
            
            currentRoom.playlist.push(videoObject);
            addedCount++;
            
            console.log(`Added video ${i + 1}/${playlistData.videos.length}: ${video.title}`);
            
            // Update display after each video for better UX
            updatePlaylistDisplay();
            
            // Small delay to prevent overwhelming the UI
            if (i < playlistData.videos.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Update server with complete playlist
        try {
            const serverResponse = await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    playlist: currentRoom.playlist,
                    lastUpdateTime: Date.now()
                })
            });
            
            if (!serverResponse.ok) {
                throw new Error('Failed to update server playlist');
            }
            
            console.log('Playlist successfully added to server');
        } catch (error) {
            console.warn('Server update failed, using localStorage fallback:', error);
            // Fallback to localStorage
            const rooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
            const roomIndex = rooms.findIndex(r => r.id === currentRoom.id);
            if (roomIndex !== -1) {
                rooms[roomIndex] = currentRoom;
                localStorage.setItem('youtubeRooms', JSON.stringify(rooms));
            }
        }
        
        // Auto-play if it's the first video and no video is currently playing
        if (currentRoom.playlist.length === addedCount && youtubePlayer && currentVideoIndex === -1) {
            loadVideo(0);
        }
        
        // Update overlay since videos now exist
        updateVideoOverlay();
        
        console.log('=== PLAYLIST IMPORT COMPLETED SUCCESSFULLY ===');
        console.log(`Added ${addedCount} videos, skipped ${skippedCount} duplicates`);
        console.log('Final playlist length:', currentRoom.playlist.length);
        
        isAddingVideo = false; // Clear flag after successful import
        
        // Force a permissions refresh to ensure buttons are updated
        setTimeout(() => {
            refreshPermissionsUI();
        }, 100);
        
    } catch (error) {
        console.error('Error importing playlist:', error);
        isAddingVideo = false; // Clear flag on error
        
        // Show error message to user
        showErrorMessage(`Failed to import playlist: ${error.message}`);
    }
}

// Show error message to user
function showErrorMessage(message) {
    // Create temporary error message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 107, 107, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 300px;
        word-wrap: break-word;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function playVideo(index) {
    if (index >= 0 && index < currentRoom.playlist.length) {
        // Check if user has permission to control playback
        if (!hasPermission('playPause')) {
            return;
        }
        
        currentVideoIndex = index;
        loadVideo(index);
        updatePlaylistDisplay();
    }
}

async function removeVideo(videoId) {
    // Check if user has permission to remove videos
    if (!hasPermission('removeVideo')) {
        return;
    }
    
    const index = currentRoom.playlist.findIndex(v => v.id === videoId);
    if (index === -1) return;
    
    currentRoom.playlist.splice(index, 1);
    
    // Handle empty playlist
    if (currentRoom.playlist.length === 0) {
        console.log('All videos removed, showing blank state');
        currentVideoIndex = -1;
        if (youtubePlayer) {
            youtubePlayer.stopVideo();
            // Also clear the video source
            youtubePlayer.loadVideoById('');
        }
        showBlankVideoState();
        updatePlaylistDisplay();
        updateVideoOverlay(); // Update overlay since no videos exist
    } else {
        // Adjust current video index for remaining videos
        if (currentVideoIndex === index) {
            // Current video was removed, load first video
            loadVideo(0);
        } else if (currentVideoIndex > index) {
            // Video before current was removed, adjust index
            currentVideoIndex--;
        }
    }
    
    try {
        // Update playlist on server
        await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                playlist: currentRoom.playlist,
                currentVideoIndex: currentVideoIndex,
                videoState: 'stopped',
                lastUpdateTime: Date.now()
            })
        });
    } catch (error) {
        console.error('Error removing video:', error);
        // Fallback to local save
        const rooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
        const roomIndex = rooms.findIndex(r => r.id === currentRoom.id);
        if (roomIndex !== -1) {
            rooms[roomIndex] = currentRoom;
            localStorage.setItem('youtubeRooms', JSON.stringify(rooms));
        }
    }
}

async function loadVideo(index) {
    if (!youtubePlayer) return;
    
    // Handle empty playlist
    if (currentRoom.playlist.length === 0) {
        console.log('Playlist is empty, clearing video player');
        youtubePlayer.stopVideo();
        currentVideoIndex = -1;
        
        // Show blank video state
        showBlankVideoState();
        
        updatePlaylistDisplay();
        return;
    }
    
    // Handle invalid index
    if (index < 0 || index >= currentRoom.playlist.length) {
        console.log('Invalid video index:', index, 'playlist length:', currentRoom.playlist.length);
        return;
    }
    
    const video = currentRoom.playlist[index];
    console.log('Loading video:', video.title, 'ID:', video.id, 'Index:', index);
    
    // Set protection flags to prevent any interference during video load
    isAutoPlaying = true;
    window.isSyncing = true;
    isSkipOperation = true;
    
    // Hide blank state when loading a video
    hideBlankVideoState();
    
    try {
        // Load the video naturally
        youtubePlayer.loadVideoById({
            videoId: video.id,
            suggestedQuality: 'medium'
        });
        
        currentVideoIndex = index;
        
        // Update room with current video index
        try {
            await fetch(`http://localhost:5000/api/rooms/${currentRoom.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    currentVideoIndex: index,
                    lastUpdateTime: Date.now()
                })
            });
            console.log('Video loaded:', video.title);
        } catch (error) {
            console.error('Error updating current video index:', error);
        }
        
        updatePlaylistDisplay();
        
        // Update overlay after video loads
        setTimeout(() => {
            updateVideoOverlay();
            console.log('Overlay updated in loadVideo function');
        }, 200);
        
        // Clear protection flags after longer delays to ensure video is stable
        setTimeout(() => {
            window.isSyncing = false;
            console.log('Sync protection cleared for video:', video.title);
        }, 4000);
        
        setTimeout(() => {
            isAutoPlaying = false;
            console.log('Auto-playing protection cleared for video:', video.title);
        }, 5000);
        
        setTimeout(() => {
            isSkipOperation = false;
            console.log('Skip operation protection cleared for video:', video.title);
        }, 6000);
        
    } catch (error) {
        console.error('Error loading video:', error);
        isAutoPlaying = false; // Clear flag on error
        window.isSyncing = false; // Clear flag on error
        isSkipOperation = false; // Clear flag on error
        // Don't show alert, just log the error
    }
}

// Show blank video state when playlist is empty
function showBlankVideoState() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;
    
    // Stop and clear the YouTube player completely
    if (youtubePlayer) {
        youtubePlayer.stopVideo();
        youtubePlayer.loadVideoById('');
    }
    
    // Hide the YouTube player
    const youtubePlayerDiv = document.getElementById('youtubePlayer');
    if (youtubePlayerDiv) {
        youtubePlayerDiv.style.display = 'none';
    }
    
    // Show blank state
    let blankState = videoContainer.querySelector('.blank-video-state');
    if (!blankState) {
        blankState = document.createElement('div');
        blankState.className = 'blank-video-state';
        blankState.innerHTML = `
            <div class="blank-video-content">
                <i class="fas fa-video-slash"></i>
                <h3>Nincs Lejátszott Videó</h3>
                <p>Add hozzá videókat a lejátszási listához a nézéshez</p>
            </div>
        `;
        videoContainer.appendChild(blankState);
    }
    blankState.style.display = 'flex';
}

// Hide blank video state when video is loaded
function hideBlankVideoState() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;
    
    // Show the YouTube player
    const youtubePlayerDiv = document.getElementById('youtubePlayer');
    if (youtubePlayerDiv) {
        youtubePlayerDiv.style.display = 'block';
        youtubePlayerDiv.style.width = '100%';
        youtubePlayerDiv.style.height = '400px';
    }
    
    // Hide blank state
    const blankState = videoContainer.querySelector('.blank-video-state');
    if (blankState) {
        blankState.style.display = 'none';
    }
    
    // Update overlay when video is shown
    setTimeout(() => {
        updateVideoOverlay();
        console.log('Overlay updated in hideBlankVideoState function');
    }, 100);
}

function playNextVideo() {
    // Handle empty playlist
    if (currentRoom.playlist.length === 0) {
        console.log('Playlist is empty, cannot play next video');
        return;
    }
    
    if (currentVideoIndex < currentRoom.playlist.length - 1) {
        loadVideo(currentVideoIndex + 1);
    } else {
        // Loop back to first video
        loadVideo(0);
    }
}



function showRoomSettings() {
    const modal = document.getElementById('roomSettingsModal');
    const passwordInput = document.getElementById('roomPassword');
    const transferSelect = document.getElementById('transferLeader');
    
    // Set current password
    passwordInput.value = currentRoom.password || '';
    
    // Populate transfer options
            transferSelect.innerHTML = '<option value="">Válassz egy résztvevőt...</option>';
    currentRoom.participants
        .filter(p => p.id !== currentRoom.leader)
        .forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.username;
            transferSelect.appendChild(option);
        });
    
    // Set current permissions
    const permissions = currentRoom.permissions || DEFAULT_PERMISSIONS;
    document.getElementById('permissionPlayPause').checked = permissions.playPause;
    document.getElementById('permissionVideoSeek').checked = permissions.videoSeek;
    document.getElementById('permissionAddVideo').checked = permissions.addVideo;
    document.getElementById('permissionRemoveVideo').checked = permissions.removeVideo;
    document.getElementById('permissionEditPlaylist').checked = permissions.editPlaylist;
    document.getElementById('permissionKickMembers').checked = permissions.kickMembers;
    
    modal.style.display = 'block';
}

async function handleRoomSettings(e) {
    e.preventDefault();
    
    console.log('Saving room settings...');
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const password = document.getElementById('roomPassword').value;
        const newLeaderId = document.getElementById('transferLeader').value;
        const deleteRoom = document.getElementById('deleteRoom').checked;
        
        if (deleteRoom) {
            // Delete room and kick all participants
            if (confirm('Are you sure you want to delete this room? All participants will be kicked out.')) {
                try {
                    await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
                        method: 'DELETE'
                    });
                    alert('Szoba sikeresen törölve');
                    window.location.href = 'index.html';
                    return;
                } catch (error) {
                    console.error('Error deleting room:', error);
                    alert('Nem sikerült törölni a szobát');
                    return;
                }
            }
        }
        
        // Update password
        currentRoom.password = password;
        
        // Update permissions
        currentRoom.permissions = {
            playPause: document.getElementById('permissionPlayPause').checked,
            videoSeek: document.getElementById('permissionVideoSeek').checked,
            addVideo: document.getElementById('permissionAddVideo').checked,
            removeVideo: document.getElementById('permissionRemoveVideo').checked,
            editPlaylist: document.getElementById('permissionEditPlaylist').checked,
            kickMembers: document.getElementById('permissionKickMembers').checked
        };
        
        console.log('Updated permissions:', currentRoom.permissions);
        
        // Transfer leadership if selected
        if (newLeaderId) {
            currentRoom.leader = newLeaderId;
            const newLeader = currentRoom.participants.find(p => p.id === newLeaderId);
            if (newLeader) {
                currentRoom.leaderUsername = newLeader.username;
            }
            isLeader = false;
        }
        
        // Save changes
        try {
            await saveRoomChanges();
            console.log('Room settings saved successfully');
            updateParticipantsDisplay();
            updateRoomUI(); // Update UI to reflect new permissions
            document.getElementById('roomSettingsModal').style.display = 'none';
            
            if (!isLeader) {
                // Remove leader controls
                const settingsBtn = document.querySelector('.room-actions .btn-secondary');
                if (settingsBtn) settingsBtn.remove();
            }
            
            // Settings saved silently
        } catch (error) {
            console.error('Error saving room settings:', error);
            alert('Nem sikerült menteni a szoba beállításokat. Kérlek próbáld újra.');
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error in room settings:', error);
        alert('Nem sikerült menteni a szoba beállításokat. Kérlek próbáld újra.');
        
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleKickUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('kickUserSelect').value;
    if (!userId) return;
    
    kickUser(userId);
    document.getElementById('kickUserModal').style.display = 'none';
}

async function kickUser(userId) {
    try {
        // Remove user from participants
        currentRoom.participants = currentRoom.participants.filter(p => p.id !== userId);
        
        // Update on server
        await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ participants: currentRoom.participants })
        });
        
        updateParticipantsDisplay();
        
        // If current user was kicked, redirect to main page
        if (userId === currentUser) {
            alert('Kirúgtak a szobából');
            window.location.href = 'index.html';
            return;
        }
        
        // If no participants left, close room
        if (currentRoom.participants.length === 0) {
            leaveRoom();
        }
    } catch (error) {
        console.error('Error kicking user:', error);
        alert('Nem sikerült kirúgni a felhasználót');
    }
}

// Utility functions
async function saveRoomChanges() {
    try {
        // Save to server
        const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentRoom)
        });
        
        if (!response.ok) {
            throw new Error('Server returned error status');
        }
        
        console.log('Room changes saved to server successfully');
    } catch (error) {
        console.error('Error saving room changes to server:', error);
        // Fallback: save to localStorage
        try {
            const rooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
            const roomIndex = rooms.findIndex(r => r.id === currentRoom.id);
            if (roomIndex !== -1) {
                rooms[roomIndex] = currentRoom;
                localStorage.setItem('youtubeRooms', JSON.stringify(rooms));
                console.log('Room changes saved to localStorage as fallback');
            }
        } catch (localError) {
            console.error('Error saving to localStorage:', localError);
            throw new Error('Failed to save room changes');
        }
    }
}

function startSyncInterval() {
    // Sync room data every 1000ms for stable experience
    syncInterval = setInterval(async () => {
        try {
            // Get updated room data from server
            const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}`));
            if (response.ok) {
                const updatedRoom = await response.json();
                
                // Only update if there are meaningful changes and we're not currently adding a video
                const hasPlaylistChange = JSON.stringify(updatedRoom.playlist) !== JSON.stringify(currentRoom.playlist);
                const hasParticipantChange = JSON.stringify(updatedRoom.participants) !== JSON.stringify(currentRoom.participants);
                const hasVideoIndexChange = updatedRoom.currentVideoIndex !== currentRoom.currentVideoIndex;
                
                if ((hasPlaylistChange || hasParticipantChange || hasVideoIndexChange) && !isAddingVideo) {
                    console.log('Sync interval updating room data:', {
                        hasPlaylistChange,
                        hasParticipantChange,
                        hasVideoIndexChange,
                        isAddingVideo
                    });
                    
                    const oldPlaylistLength = currentRoom.playlist.length;
                    const oldCurrentIndex = currentVideoIndex;
                    
                    currentRoom = updatedRoom;
                    updateRoomUI();
                    updatePlaylistDisplay();
                    updateParticipantsDisplay();
                    
                    // Handle playlist changes
                    if (updatedRoom.playlist.length !== oldPlaylistLength) {
                        if (updatedRoom.playlist.length > oldPlaylistLength) {
                            // Video added
                            if (updatedRoom.playlist.length === 1 && youtubePlayer) {
                                loadVideo(0);
                            }
                        } else if (updatedRoom.playlist.length < oldPlaylistLength) {
                            // Video removed
                            if (currentVideoIndex >= updatedRoom.playlist.length) {
                                currentVideoIndex = Math.max(0, updatedRoom.playlist.length - 1);
                                if (updatedRoom.playlist.length > 0) {
                                    loadVideo(currentVideoIndex);
                                }
                            }
                        }
                    }
                    
                    // Handle current video index changes
                    if (hasVideoIndexChange && updatedRoom.currentVideoIndex !== undefined) {
                        currentVideoIndex = updatedRoom.currentVideoIndex;
                        if (youtubePlayer && updatedRoom.playlist[currentVideoIndex]) {
                            const currentVideo = youtubePlayer.getVideoData();
                            if (currentVideo.video_id !== updatedRoom.playlist[currentVideoIndex].id) {
                                loadVideo(currentVideoIndex);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing room data:', error);
        }
    }, 1000); // Stable 1-second interval
}

async function leaveRoom() {
    try {
        // Notify server about leaving
        const response = await fetch(getApiUrl(`/rooms/${currentRoom.id}/leave`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: currentUser })
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update local room data
            if (result.room) {
                currentRoom = result.room;
            }
        }
    } catch (error) {
        console.error('Error leaving room:', error);
        // Fallback: remove user locally
        if (currentRoom) {
            currentRoom.participants = currentRoom.participants.filter(p => p.id !== currentUser);
            saveRoomChanges();
        }
    }
    
    // Clear sync interval
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Go back to main page
    window.location.href = 'index.html';
}

// Test to see if script loaded completely
console.log('Room script file loaded completely');