// Firebase configuration for Resenha Chat
const firebaseConfig = {
  apiKey: "AIzaSyC74VmLuke5avBEFMRgFc1FWTsMftcfnWg",
  authDomain: "resenha-cb4dd.firebaseapp.com",
  databaseURL: "https://resenha-cb4dd-default-rtdb.firebaseio.com",
  projectId: "resenha-cb4dd",
  storageBucket: "resenha-cb4dd.firebasestorage.app",
  messagingSenderId: "762080824319",
  appId: "1:762080824319:web:2fc31b366e2768792375ca"
};

// Enable detailed logging for debugging
localStorage.setItem('firebase:previous_websocket_failure', true);

// Initialize Firebase with retry mechanism
function initializeFirebase(retryCount = 0, maxRetries = 3) {
  try {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não foi carregado corretamente");
    }
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Make database globally accessible
    window.database = firebase.database();
    console.log("Database reference created");
    
    // Enable persistent connections
    window.database.goOnline();
    
    // Test database connection
    window.database.ref('.info/connected').on('value', (snapshot) => {
      const connected = snapshot.val();
      console.log("Firebase connection state:", connected ? "connected" : "disconnected");
      
      if (connected) {
        // Hide error message if it was displayed
        const firebaseError = document.getElementById('firebase-error');
        if (firebaseError) {
          firebaseError.style.display = 'none';
        }
      } else if (!connected && retryCount >= maxRetries) {
        // Show error message if not connected after max retries
        setTimeout(() => {
          const firebaseError = document.getElementById('firebase-error');
          if (firebaseError && !snapshot.val()) {
            firebaseError.style.display = 'block';
            const errorMsg = document.getElementById('firebase-error-message');
            if (errorMsg) {
              errorMsg.textContent = 'Erro ao conectar com o Firebase. Verifique sua conexão.';
            }
          }
        }, 5000);
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying Firebase initialization (${retryCount + 1}/${maxRetries})...`);
      
      // Retry after delay
      setTimeout(() => {
        initializeFirebase(retryCount + 1, maxRetries);
      }, 3000); // 3 second delay between retries
      
      return false;
    } else {
      // Show error notification after all retries failed
      setTimeout(() => {
        const firebaseError = document.getElementById('firebase-error');
        if (firebaseError) {
          firebaseError.style.display = 'block';
          const errorMsg = document.getElementById('firebase-error-message');
          if (errorMsg) {
            errorMsg.textContent = 'Erro ao inicializar Firebase: ' + error.message;
          }
        }
      }, 1000);
      
      return false;
    }
  }
}

// Start Firebase initialization
initializeFirebase();

// Function to get the current master password
window.getMasterPasswordFromFirebase = async function() {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    const passwordRef = window.database.ref('adminSettings/masterPassword');
    const snapshot = await passwordRef.once('value');
    console.log("Password retrieved from Firebase:", snapshot.exists() ? "exists" : "does not exist");
    return snapshot.val() || 'resenha123'; // Default fallback
  } catch (error) {
    console.error('Error getting master password:', error);
    return 'resenha123'; // Default fallback on error
  }
}

// Function to set the master password in Firebase
window.setMasterPasswordInFirebase = async function(newPassword) {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    await window.database.ref('adminSettings/masterPassword').set(newPassword);
    console.log("Password successfully set in Firebase");
    return true;
  } catch (error) {
    console.error('Error setting master password:', error);
    return false;
  }
}

// Function to get the super master password (for permanent access)
window.getSuperMasterPasswordFromFirebase = async function() {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    const passwordRef = window.database.ref('adminSettings/superMasterPassword');
    const snapshot = await passwordRef.once('value');
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      // If no super master password is set, create one and store it
      const defaultSuperMaster = 'resenha@admin';
      await window.database.ref('adminSettings/superMasterPassword').set(defaultSuperMaster);
      return defaultSuperMaster;
    }
  } catch (error) {
    console.error('Error getting super master password:', error);
    return 'resenha@admin'; // Fallback default
  }
}

// Function to set the super master password
window.setSuperMasterPasswordInFirebase = async function(newPassword) {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    await window.database.ref('adminSettings/superMasterPassword').set(newPassword);
    console.log("Super master password successfully set in Firebase");
    return true;
  } catch (error) {
    console.error('Error setting super master password:', error);
    return false;
  }
}

// ----------------- Enhanced Username Uniqueness System -----------------

// Constants for username presence system
const USERNAME_ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 60 * 1000; // 1 minute heartbeat
const INACTIVE_CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
const SESSION_ID = generateSessionId(); // Unique session ID for this browser tab

// Generate a unique session ID for this browser instance
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Generate or retrieve device ID
window.getOrCreateDeviceId = function() {
  let deviceId = localStorage.getItem('resenha_device_id');
  
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    localStorage.setItem('resenha_device_id', deviceId);
  }
  
  return deviceId;
}

// Get reference to active users
window.getActiveUsersRef = function() {
  if (!window.database) {
    console.error("Database not initialized");
    return null;
  }
  return window.database.ref('activeUsers');
}

// Get reference to user sessions
window.getUserSessionsRef = function() {
  if (!window.database) {
    console.error("Database not initialized");
    return null;
  }
  return window.database.ref('userSessions');
}

// Get device information for better tracking
window.getDeviceInfo = function() {
  const now = new Date();
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timestamp: now.toISOString(),
    localTime: now.toLocaleTimeString()
  };
}

// Create a more efficient presence system using onDisconnect
window.setupPresenceSystem = function() {
  const database = window.database;
  if (!database) return;
  
  // Get the device ID
  const deviceId = window.getOrCreateDeviceId();
  
  // Reference to our device's connection state
  const connectedRef = database.ref('.info/connected');
  
  // Reference to our device's presence
  const devicePresenceRef = database.ref(`/devices/${deviceId}`);
  
  // When we connect or disconnect, update our status
  connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === true) {
      console.log('Connected to Firebase, setting up presence system');
      
      // Set up what happens when we disconnect
      devicePresenceRef.onDisconnect().update({
        connected: false,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        sessionId: SESSION_ID
      });
      
      // Set that we're online
      devicePresenceRef.update({
        connected: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        deviceInfo: window.getDeviceInfo(),
        sessionId: SESSION_ID
      });
    }
  });
  
  // Set up cleanup on page close/refresh
  window.addEventListener('beforeunload', () => {
    devicePresenceRef.update({
      connected: false,
      lastSeen: Date.now()
    });
  });
}

// Function to check if a username is already active
window.isUsernameActive = async function(username) {
  try {
    if (!username || username.trim() === '') {
      return false; // Empty username is never active
    }
    
    const activeUsersRef = window.getActiveUsersRef();
    if (!activeUsersRef) {
      return false; // If database isn't available, allow any username
    }
    
    // Check if the username exists in active users
    const snapshot = await activeUsersRef.child(username).once('value');
    
    if (!snapshot.exists()) {
      return false; // Username is not active
    }
    
    // Check if the user is still considered active
    const userData = snapshot.val();
    const timeoutAgo = Date.now() - USERNAME_ACTIVITY_TIMEOUT;
    
    // If last seen time is older than our timeout, consider inactive
    if (userData.lastSeen < timeoutAgo) {
      // User was inactive, so we can reuse this username
      // Clean up the stale entry
      console.log(`Removing stale username: ${username} (last seen ${new Date(userData.lastSeen).toLocaleTimeString()})`);
      await activeUsersRef.child(username).remove();
      return false;
    }
    
    // Check if this is the same device trying to use the same name
    const deviceId = window.getOrCreateDeviceId();
    if (userData.deviceId === deviceId) {
      // Same device, allow reuse of username
      console.log(`Same device reconnecting with username: ${username}`);
      return false;
    }
    
    // Check if this is the same session trying to reconnect
    if (userData.sessionId === SESSION_ID) {
      console.log(`Same session reconnecting with username: ${username}`);
      return false;
    }
    
    console.log(`Username ${username} is already active (last seen ${new Date(userData.lastSeen).toLocaleTimeString()})`);
    return true; // Username is active and used by someone else
  } catch (error) {
    console.error('Error checking username activity:', error);
    return false; // Default to allowing the username on error
  }
}

// Function to register a username as active
window.registerActiveUsername = async function(username) {
  try {
    if (!username || username.trim() === '') {
      return false; // Can't register empty username
    }
    
    const activeUsersRef = window.getActiveUsersRef();
    if (!activeUsersRef) {
      return false;
    }
    
    // Get device ID
    const deviceId = window.getOrCreateDeviceId();
    
    // Set up new user entry
    const userData = {
      username: username,
      deviceId: deviceId,
      sessionId: SESSION_ID,
      lastSeen: Date.now(),
      deviceInfo: window.getDeviceInfo(),
      connected: true
    };
    
    // Set username as active
    await activeUsersRef.child(username).set(userData);
    
    console.log(`Registered username as active: ${username}`);
    
    // Also store in session-specific data
    await window.getUserSessionsRef().child(SESSION_ID).set({
      username: username,
      deviceId: deviceId,
      lastSeen: Date.now()
    });
    
    // Set up disconnect handler to update last seen and connected status
    activeUsersRef.child(username).onDisconnect().update({
      connected: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Set up automatic heartbeat
    window.setupUsernameHeartbeat(username);
    
    return true;
  } catch (error) {
    console.error('Error registering active username:', error);
    return false;
  }
}

// Set up a heartbeat system to maintain username ownership
window.setupUsernameHeartbeat = function(username) {
  if (!username) return;
  
  // Clear any existing heartbeat
  const existingHeartbeatId = localStorage.getItem('resenha_username_heartbeat');
  if (existingHeartbeatId) {
    clearInterval(parseInt(existingHeartbeatId, 10));
    localStorage.removeItem('resenha_username_heartbeat');
  }
  
  // Create new heartbeat interval
  const heartbeatId = setInterval(() => {
    window.updatePresence(username);
  }, PRESENCE_UPDATE_INTERVAL);
  
  // Store the interval ID for cleanup
  localStorage.setItem('resenha_username_heartbeat', heartbeatId.toString());
  
  // Also update now
  window.updatePresence(username);
}

// Update user presence - streamlined version that doesn't require checks
window.updatePresence = async function(username) {
  try {
    if (!username) {
      // Try to get the username from session or localStorage
      const sessionData = await window.getUserSessionsRef().child(SESSION_ID).once('value');
      if (sessionData.exists()) {
        username = sessionData.val().username;
      } else {
        username = localStorage.getItem('resenha_username');
      }
      
      if (!username) return; // No username found
    }
    
    const activeUsersRef = window.getActiveUsersRef();
    if (!activeUsersRef) return;
    
    // Update the lastSeen timestamp 
    await activeUsersRef.child(username).update({
      lastSeen: Date.now(),
      connected: true,
      sessionId: SESSION_ID // Always make sure our session ID is recorded
    });
    
    // Also update our session data
    await window.getUserSessionsRef().child(SESSION_ID).update({
      lastSeen: Date.now(),
      username: username
    });
    
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

// Clean up presence when user leaves
window.cleanupPresence = function() {
  // Clear the heartbeat interval
  const heartbeatId = localStorage.getItem('resenha_username_heartbeat');
  if (heartbeatId) {
    clearInterval(parseInt(heartbeatId, 10));
    localStorage.removeItem('resenha_username_heartbeat');
  }
  
  // Get the current username 
  const username = localStorage.getItem('resenha_username');
  
  if (username && window.getActiveUsersRef()) {
    window.getActiveUsersRef().child(username).update({
      connected: false,
      lastSeen: Date.now()
    }).catch(error => {
      console.error('Error updating offline status:', error);
    });
  }
  
  // Clean up session data
  if (window.getUserSessionsRef()) {
    window.getUserSessionsRef().child(SESSION_ID).remove()
      .catch(error => {
        console.error('Error cleaning up session data:', error);
      });
  }
}

// Set up automatic cleanup of inactive users
window.setupInactiveUserCleanup = function() {
  const activeUsersRef = window.getActiveUsersRef();
  if (!activeUsersRef) {
    return;
  }
  
  console.log(`Setting up inactive user cleanup every ${INACTIVE_CLEANUP_INTERVAL/1000} seconds`);
  
  // Clear any existing interval
  const existingIntervalId = localStorage.getItem('resenha_inactive_cleanup_interval');
  if (existingIntervalId) {
    clearInterval(parseInt(existingIntervalId, 10));
  }
  
  const intervalId = setInterval(async () => {
    try {
      const timeoutAgo = Date.now() - USERNAME_ACTIVITY_TIMEOUT;
      const snapshot = await activeUsersRef.once('value');
      
      const deletePromises = [];
      
      snapshot.forEach(childSnapshot => {
        const userData = childSnapshot.val();
        const username = childSnapshot.key;
        
        if (userData.lastSeen < timeoutAgo || userData.connected === false) {
          console.log(`Cleaning up inactive user: ${username} (last seen: ${new Date(userData.lastSeen).toLocaleTimeString()}, connected: ${userData.connected})`);
          deletePromises.push(activeUsersRef.child(username).remove());
        }
      });
      
      await Promise.all(deletePromises);
      
      if (deletePromises.length > 0) {
        console.log(`Cleaned up ${deletePromises.length} inactive users`);
      }
      
      // Also clean up orphaned sessions
      const sessionsSnapshot = await window.getUserSessionsRef().once('value');
      const sessionCleanupPromises = [];
      
      sessionsSnapshot.forEach(childSnapshot => {
        const sessionData = childSnapshot.val();
        
        if (sessionData.lastSeen < timeoutAgo) {
          sessionCleanupPromises.push(window.getUserSessionsRef().child(childSnapshot.key).remove());
        }
      });
      
      await Promise.all(sessionCleanupPromises);
      
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }, INACTIVE_CLEANUP_INTERVAL);
  
  localStorage.setItem('resenha_inactive_cleanup_interval', intervalId.toString());
}

// Initialize the presence system immediately
window.setupPresenceSystem();