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
const USERNAME_ACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes (reduced from 5)
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds (reduced from 1 minute)
const INACTIVE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute (reduced from 5 minutes)

// Get reference to active users
window.getActiveUsersRef = function() {
  if (!window.database) {
    console.error("Database not initialized");
    return null;
  }
  return window.database.ref('activeUsers');
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
    const deviceId = localStorage.getItem('resenha_device_id');
    if (userData.deviceId === deviceId) {
      // Same device, allow reuse of username
      console.log(`Same device reconnecting with username: ${username}`);
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
    
    // Generate device ID if none exists
    if (!localStorage.getItem('resenha_device_id')) {
      const deviceId = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
      localStorage.setItem('resenha_device_id', deviceId);
    }
    
    const deviceId = localStorage.getItem('resenha_device_id');
    
    // Set username as active with current timestamp and device info
    await activeUsersRef.child(username).set({
      username: username,
      deviceId: deviceId,
      lastSeen: Date.now(),
      deviceInfo: window.getDeviceInfo(),
      connected: true
    });
    
    console.log(`Registered username as active: ${username}`);
    
    // Set up periodic updates to maintain active status
    window.startPresenceUpdates(username);
    
    // Set up cleanup on page unload
    window.addEventListener('beforeunload', () => {
      // Try to mark as disconnected immediately
      const disconnectRef = activeUsersRef.child(username);
      disconnectRef.child('connected').set(false);
      disconnectRef.child('lastSeen').set(Date.now());
      
      // Also run the regular cleanup
      window.cleanupPresence(username);
    });
    
    // Also set up onDisconnect handler for server-side cleanup
    activeUsersRef.child(username).onDisconnect().update({
      connected: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    return true;
  } catch (error) {
    console.error('Error registering active username:', error);
    return false;
  }
}

// Keep user's active status up to date
window.startPresenceUpdates = function(username) {
  if (!username || !window.getActiveUsersRef()) {
    return;
  }
  
  // Clear any existing interval to prevent duplicates
  window.cleanupPresence(username);
  
  console.log(`Starting presence updates for ${username} every ${PRESENCE_UPDATE_INTERVAL/1000} seconds`);
  
  // Update last seen more frequently
  const intervalId = setInterval(() => {
    const activeUsersRef = window.getActiveUsersRef();
    if (!activeUsersRef) return;
    
    activeUsersRef.child(username).update({
      lastSeen: Date.now(),
      connected: true
    }).catch(error => {
      console.error('Error updating active status:', error);
    });
  }, PRESENCE_UPDATE_INTERVAL);
  
  // Store the interval ID for cleanup
  localStorage.setItem('resenha_presence_interval', intervalId);
}

// Clean up presence when user leaves
window.cleanupPresence = function(username) {
  // Clear the update interval
  const intervalId = localStorage.getItem('resenha_presence_interval');
  if (intervalId) {
    clearInterval(parseInt(intervalId, 10));
    localStorage.removeItem('resenha_presence_interval');
  }
  
  // Mark user as offline by updating their status
  if (username && window.getActiveUsersRef()) {
    window.getActiveUsersRef().child(username).update({
      connected: false,
      lastSeen: Date.now()
    }).catch(error => {
      console.error('Error updating offline status:', error);
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
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }, INACTIVE_CLEANUP_INTERVAL);
  
  localStorage.setItem('resenha_inactive_cleanup_interval', intervalId);
}