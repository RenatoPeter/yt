// Global variables
let rooms = [];
let currentUser = null;
let userIP = null;
let userDevice = null;
const API_BASE_URL = window.location.origin + '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadRooms();
});

// Initialize the application
async function initializeApp() {
    // Get user IP and device info
    await getUserInfo();
    
    // Load existing rooms from server
    await loadRoomsFromServer();
    
    // Update rooms display
    updateRoomsDisplay();
    
    // Update device info display
    updateDeviceInfoDisplay();
    
    // Start auto-refresh for rooms
    startRoomRefresh();
}

// Get user information (IP and device)
async function getUserInfo() {
    try {
        // Get IP address
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIP = data.ip;
        
        // Get device information
        userDevice = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            // Add browser-specific identifiers
            browserName: getBrowserName(),
            browserVersion: getBrowserVersion(),
            // Add session-specific identifier
            sessionId: generateSessionId()
        };
        
        // Generate unique user ID based on IP, device, and session
        currentUser = generateUserId(userIP, userDevice);
        // Save to localStorage for room page access
        localStorage.setItem('currentUser', currentUser);
    } catch (error) {
        console.error('Error getting user info:', error);
        // Fallback to random ID
        currentUser = 'user_' + Math.random().toString(36).substr(2, 9);
    }
}

// Generate unique user ID
function generateUserId(ip, device) {
    // Create a more unique user ID that better distinguishes between browser sessions
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 10);
    
    // Include more browser-specific data for better uniqueness
    const deviceString = `${device.userAgent}_${device.platform}_${device.screenResolution}_${device.browserName}_${device.browserVersion}_${device.sessionId}_${timestamp}_${random}`;
    const combined = ip + deviceString;
    
    // Create a more robust hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to base36 and take first 20 characters
    return Math.abs(hash).toString(36) + random.substr(0, 10);
}

// Get browser name
function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
}

// Get browser version
function getBrowserVersion() {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(chrome|firefox|safari|edge|opera)\/(\d+)/i);
    return match ? match[2] : 'unknown';
}

// Generate session ID
function generateSessionId() {
    // Create a more unique session ID that includes browser-specific data
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 15);
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create a hash-like string from browser-specific data
    const browserData = `${userAgent}_${language}_${timezone}_${timestamp}_${random}`;
    return btoa(browserData).replace(/[^a-zA-Z0-9]/g, '').substr(0, 25);
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Update device info display
function updateDeviceInfoDisplay() {
    const userIPElement = document.getElementById('userIP');
    const browserInfoElement = document.getElementById('browserInfo');
    const deviceTypeElement = document.getElementById('deviceType');
    const sessionInfoElement = document.getElementById('sessionInfo');
    
    if (userIPElement && userIP) {
        userIPElement.textContent = userIP;
    }
    
    if (browserInfoElement && userDevice) {
        browserInfoElement.textContent = `${userDevice.browserName} ${userDevice.browserVersion}`;
    }
    
    if (deviceTypeElement) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(navigator.userAgent);
        
        if (isTablet) {
            deviceTypeElement.textContent = 'Tablet';
        } else if (isMobile) {
            deviceTypeElement.textContent = 'Mobile';
        } else {
            deviceTypeElement.textContent = 'Desktop';
        }
    }
    
    if (sessionInfoElement && userDevice) {
        // Show a shortened version of the session ID for debugging
        const shortSessionId = userDevice.sessionId.substr(0, 8);
        sessionInfoElement.textContent = `Session: ${shortSessionId}`;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Create room form
    const createRoomForm = document.getElementById('createRoomForm');
    createRoomForm.addEventListener('submit', handleCreateRoom);
    
    // Join room modal
    const joinModal = document.getElementById('joinRoomModal');
    const closeJoinModal = document.getElementById('closeJoinModal');
    const joinRoomForm = document.getElementById('joinRoomForm');
    
    closeJoinModal.addEventListener('click', () => {
        joinModal.style.display = 'none';
    });
    
    joinRoomForm.addEventListener('click', (e) => {
        if (e.target === joinModal) {
            joinModal.style.display = 'none';
        }
    });
    
    joinRoomForm.addEventListener('submit', handleJoinRoom);
    
    // Password error modal
    const passwordErrorModal = document.getElementById('passwordErrorModal');
    const closePasswordError = document.getElementById('closePasswordError');
    const retryPassword = document.getElementById('retryPassword');
    
    closePasswordError.addEventListener('click', () => {
        passwordErrorModal.style.display = 'none';
    });
    
    retryPassword.addEventListener('click', () => {
        passwordErrorModal.style.display = 'none';
        joinModal.style.display = 'block';
    });
    
    passwordErrorModal.addEventListener('click', (e) => {
        if (e.target === passwordErrorModal) {
            passwordErrorModal.style.display = 'none';
        }
    });
}

// Show password error modal
function showPasswordError() {
    document.getElementById('joinRoomModal').style.display = 'none';
    document.getElementById('passwordErrorModal').style.display = 'block';
}

// Handle create room
async function handleCreateRoom(e) {
    e.preventDefault();
    
    const roomName = document.getElementById('roomName').value.trim();
    const roomPassword = document.getElementById('roomPassword').value.trim();
    const leaderUsername = document.getElementById('leaderUsername').value.trim();
    
    if (!roomName) {
        alert('Kérlek írd be a szoba nevét');
        return;
    }
    
    if (!leaderUsername) {
        alert('Kérlek írd be a felhasználóneved');
        return;
    }
    
    // Check if user is already in any room
    const userInRoom = rooms.find(room => 
        room.participants && room.participants.some(p => p.id === currentUser)
    );
    
    if (userInRoom) {
        alert('Már egy szobában vagy. Kérlek hagyd el a jelenlegi szobát, mielőtt újat hoznál létre.');
        return;
    }
    
    try {
        // Create room
        const room = await createRoom(roomName, roomPassword, leaderUsername);
        
        // Clear form
        document.getElementById('createRoomForm').reset();
        
        // Open room
        openRoom(room.id, true);
    } catch (error) {
        console.error('Error creating room:', error);
    }
}

// Create a new room
async function createRoom(name, password = '', leaderUsername = '') {
    const room = {
        id: generateRoomId(),
        name: name,
        password: password,
        leader: currentUser,
        leaderUsername: leaderUsername,
        participants: [],
        playlist: [],
        createdAt: new Date().toISOString(),
        isActive: true // Room is active immediately since leader username is provided
    };
    
    // Add leader to participants
    room.participants.push({
        id: currentUser,
        username: leaderUsername,
        joinedAt: new Date().toISOString()
    });
    
    try {
        // Save to server
        await saveRoomToServer(room);
        
        // Add to local array
        rooms.push(room);
        
        return room;
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Nem sikerült létrehozni a szobát. Kérlek próbáld újra.');
        throw error;
    }
}

// Generate room ID
function generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
}

// Handle join room
async function handleJoinRoom(e) {
    e.preventDefault();
    
    const roomId = e.target.dataset.roomId;
    const password = document.getElementById('joinPassword').value;
    const username = document.getElementById('joinUsername').value.trim();
    
    if (!username) {
        alert('Kérlek írd be a felhasználóneved');
        return;
    }
    
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        alert('Szoba nem található');
        return;
    }
    
    // Check password if required
    if (room.password && room.password !== password) {
        showPasswordError();
        return;
    }
    
    // Check if room is active
    if (!room.isActive) {
        alert('A szoba még nem aktív. Kérlek várj, amíg a vezető beállítja a felhasználónevét.');
        return;
    }
    
    // Check if user is already in this room
    const alreadyInRoom = room.participants.find(p => p.id === currentUser);
    if (alreadyInRoom) {
        // User is already in this room, just redirect
        openRoom(roomId, alreadyInRoom.id === room.leader);
        document.getElementById('joinModal').style.display = 'none';
        document.getElementById('joinRoomForm').reset();
        return;
    }
    
    // Check if user is in another room
    const userInOtherRoom = rooms.find(r => 
        r.id !== roomId && r.participants && r.participants.some(p => p.id === currentUser)
    );
    
    if (userInOtherRoom) {
        alert('Már egy másik szobában vagy. Kérlek hagyd el azt a szobát, mielőtt ehhez csatlakoznál.');
        return;
    }
    
    try {
        // Join room
        await joinRoom(roomId, username);
        
        // Close modal
        document.getElementById('joinRoomModal').style.display = 'none';
        document.getElementById('joinRoomForm').reset();
    } catch (error) {
        console.error('Error joining room:', error);
    }
}

// Join a room
async function joinRoom(roomId, username) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    // Check if user is already in room
    const existingParticipant = room.participants.find(p => p.id === currentUser);
    if (existingParticipant) {
        // User is already in the room, just update username and redirect
        existingParticipant.username = username;
        try {
            await updateRoomOnServer(roomId, { participants: room.participants });
            openRoom(roomId, existingParticipant.id === room.leader);
        } catch (error) {
            console.error('Error updating username:', error);
            alert('Nem sikerült frissíteni a felhasználónevet. Kérlek próbáld újra.');
        }
        return;
    }
    
    // Check if username is already taken in this room
    const usernameTaken = room.participants.find(p => p.username === username);
    if (usernameTaken) {
        alert('Ez a felhasználónév már foglalt ebben a szobában. Kérlek válassz egy másik felhasználónevet.');
        return;
    }
    
    // Add new participant
    room.participants.push({
        id: currentUser,
        username: username,
        joinedAt: new Date().toISOString()
    });
    
    try {
        // Update room on server
        await updateRoomOnServer(roomId, { participants: room.participants });
        
        // Open room
        openRoom(roomId, false);
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Nem sikerült csatlakozni a szobához. Kérlek próbáld újra.');
    }
}



// Open room in current window
function openRoom(roomId, isLeader) {
    const url = `room.html?roomId=${roomId}&isLeader=${isLeader}`;
    window.location.href = url;
}

// Load rooms from server
async function loadRoomsFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        if (response.ok) {
            rooms = await response.json();
        } else {
            console.error('Failed to load rooms from server, using localStorage fallback');
            loadRoomsFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading rooms from server, using localStorage fallback:', error);
        loadRoomsFromLocalStorage();
    }
}

// Load rooms from localStorage (fallback)
function loadRoomsFromLocalStorage() {
    const storedRooms = localStorage.getItem('youtubeRooms');
    if (storedRooms) {
        rooms = JSON.parse(storedRooms);
    } else {
        rooms = [];
    }
}

// Save room to server
async function saveRoomToServer(room) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(room)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save room to server');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving room to server, using localStorage fallback:', error);
        // Fallback to localStorage
        saveRoomToLocalStorage(room);
        return { success: true, room_id: room.id };
    }
}

// Save room to localStorage (fallback)
function saveRoomToLocalStorage(room) {
    const storedRooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
    storedRooms.push(room);
    localStorage.setItem('youtubeRooms', JSON.stringify(storedRooms));
}

// Update room on server
async function updateRoomOnServer(roomId, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update room on server');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating room on server, using localStorage fallback:', error);
        // Fallback to localStorage
        updateRoomInLocalStorage(roomId, updates);
        return { success: true };
    }
}

// Update room in localStorage (fallback)
function updateRoomInLocalStorage(roomId, updates) {
    const storedRooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
    const roomIndex = storedRooms.findIndex(r => r.id === roomId);
    if (roomIndex !== -1) {
        Object.assign(storedRooms[roomIndex], updates);
        localStorage.setItem('youtubeRooms', JSON.stringify(storedRooms));
    }
}

// Delete room from server
async function deleteRoomFromServer(roomId) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete room from server');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting room from server, using localStorage fallback:', error);
        // Fallback to localStorage
        deleteRoomFromLocalStorage(roomId);
        return { success: true };
    }
}

// Delete room from localStorage (fallback)
function deleteRoomFromLocalStorage(roomId) {
    const storedRooms = JSON.parse(localStorage.getItem('youtubeRooms') || '[]');
    const filteredRooms = storedRooms.filter(r => r.id !== roomId);
    localStorage.setItem('youtubeRooms', JSON.stringify(filteredRooms));
}

// Load and display rooms
async function loadRooms() {
    try {
        await loadRoomsFromServer();
        updateRoomsDisplay();
    } catch (error) {
        console.error('Error loading rooms:', error);
        updateRoomsDisplay();
    }
}

// Auto-refresh rooms every 10 seconds
function startRoomRefresh() {
    setInterval(async () => {
        await loadRooms();
    }, 10000);
}

// Update rooms display
function updateRoomsDisplay() {
    const container = document.getElementById('roomsContainer');
    
    if (rooms.length === 0) {
        container.innerHTML = `
            <div class="empty-rooms">
                <i class="fas fa-users"></i>
                <p>Nincs elérhető szoba</p>
                <p>Hozz létre egy szobát a kezdéshez!</p>
            </div>
        `;
        return;
    }
    
    // Filter active rooms only
    const activeRooms = rooms.filter(room => room.isActive);
    
    if (activeRooms.length === 0) {
        container.innerHTML = `
            <div class="empty-rooms">
                <i class="fas fa-clock"></i>
                <p>Nincs aktív szoba</p>
                <p>A szobák itt fognak megjelenni, amint a vezetők beállítják a felhasználónevüket</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activeRooms.map(room => `
        <div class="room-card">
            <div class="room-info">
                <div class="room-name">${room.name}</div>
                <div class="room-details">
                    <span><i class="fas fa-users"></i> ${room.participants.length} résztvevő</span>
                    <span><i class="fas fa-music"></i> ${room.playlist.length} videó</span>
                    <span>
                        <i class="fas fa-${room.password ? 'lock' : 'unlock'}"></i>
                        ${room.password ? 'Jelszóval Védett' : 'Nyilvános'}
                    </span>
                </div>
            </div>
            <div class="room-actions">
                <button class="btn btn-primary" onclick="showJoinModal('${room.id}', ${!!room.password})">
                    <i class="fas fa-sign-in-alt"></i> Csatlakozás
                </button>
            </div>
        </div>
    `).join('');
}

// Show join modal
function showJoinModal(roomId, hasPassword) {
    const modal = document.getElementById('joinRoomModal');
    const joinPassword = document.getElementById('joinPassword');
    const passwordLabel = joinPassword.previousElementSibling;
    
    // Show/hide password field and label
    if (hasPassword) {
        joinPassword.style.display = 'block';
        passwordLabel.style.display = 'block';
        joinPassword.required = true;
    } else {
        joinPassword.style.display = 'none';
        passwordLabel.style.display = 'none';
        joinPassword.required = false;
    }
    
    // Set room ID for form submission
    document.getElementById('joinRoomForm').dataset.roomId = roomId;
    
    // Show modal
    modal.style.display = 'block';
}

// Auto-refresh rooms every 30 seconds
setInterval(async () => {
    try {
        await loadRoomsFromServer();
        updateRoomsDisplay();
    } catch (error) {
        console.error('Error refreshing rooms:', error);
    }
}, 30000);

// Export functions for room page
window.RoomManager = {
    getRooms: () => rooms,
    getCurrentUser: () => currentUser,
    getUserInfo: () => ({ ip: userIP, device: userDevice }),
    updateRoom: async (roomId, updates) => {
        try {
            await updateRoomOnServer(roomId, updates);
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                Object.assign(room, updates);
            }
        } catch (error) {
            console.error('Error updating room:', error);
        }
    },
    removeRoom: async (roomId) => {
        try {
            await deleteRoomFromServer(roomId);
            rooms = rooms.filter(r => r.id !== roomId);
        } catch (error) {
            console.error('Error removing room:', error);
        }
    },
    addVideoToRoom: async (roomId, video) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                room.playlist.push(video);
                await updateRoomOnServer(roomId, { playlist: room.playlist });
            }
        } catch (error) {
            console.error('Error adding video:', error);
        }
    },
    removeVideoFromRoom: async (roomId, videoId) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                room.playlist = room.playlist.filter(v => v.id !== videoId);
                await updateRoomOnServer(roomId, { playlist: room.playlist });
            }
        } catch (error) {
            console.error('Error removing video:', error);
        }
    },
    updatePlaylist: async (roomId, playlist) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                room.playlist = playlist;
                await updateRoomOnServer(roomId, { playlist: room.playlist });
            }
        } catch (error) {
            console.error('Error updating playlist:', error);
        }
    },
    addParticipant: async (roomId, participant) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                const existing = room.participants.find(p => p.id === participant.id);
                if (!existing) {
                    room.participants.push(participant);
                    await updateRoomOnServer(roomId, { participants: room.participants });
                }
            }
        } catch (error) {
            console.error('Error adding participant:', error);
        }
    },
    removeParticipant: async (roomId, participantId) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                room.participants = room.participants.filter(p => p.id !== participantId);
                await updateRoomOnServer(roomId, { participants: room.participants });
            }
        } catch (error) {
            console.error('Error removing participant:', error);
        }
    },
    transferLeadership: async (roomId, newLeaderId) => {
        try {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
                room.leader = newLeaderId;
                const newLeader = room.participants.find(p => p.id === newLeaderId);
                if (newLeader) {
                    room.leaderUsername = newLeader.username;
                }
                await updateRoomOnServer(roomId, { 
                    leader: room.leader, 
                    leaderUsername: room.leaderUsername 
                });
            }
        } catch (error) {
            console.error('Error transferring leadership:', error);
        }
    },
    getVideoMetadata: async (url) => {
        try {
            const response = await fetch(`${API_BASE_URL}/video/metadata`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to get video metadata');
            }
        } catch (error) {
            console.error('Error getting video metadata from server, using fallback:', error);
            // Fallback: extract basic info from URL
            const videoId = extractYouTubeVideoId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }
            return {
                video_id: videoId,
                title: `Video ${videoId}`,
                uploader: 'Unknown Channel',
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                url: url
            };
        }
    }
};
