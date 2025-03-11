// Password Protection
const MASTER_PASSWORD = "resenha123"; // Default password
const passwordOverlay = document.getElementById('password-overlay');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const unlockBtn = document.getElementById('unlock-btn');
const passwordError = document.getElementById('password-error');

// UI Elements
const usernameInput = document.getElementById('username-input');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const messagesContainer = document.getElementById('messages-container');
const retryFirebaseBtn = document.getElementById('retry-firebase-btn');

// Secret prefix to identify master password - only you know this
const MASTER_PREFIX = "msm:"; // The secret prefix that only you know

// Check if authentication is needed
function checkAuthStatus() {
  // Check for permanent access first
  const permanentAccess = localStorage.getItem('resenha_permanent_access');
  if (permanentAccess === 'true') {
    console.log("User has permanent access");
    showPasswordOverlay(false);
    trackUserLogin();
    return;
  }
  
  // Regular daily access check
  const lastAuth = localStorage.getItem('resenha_last_auth');
  const currentDate = new Date().toDateString();
  
  if (!lastAuth || lastAuth !== currentDate) {
    // New day or first visit, show password overlay
    showPasswordOverlay(true);
  } else {
    // Already authenticated today
    showPasswordOverlay(false);
    
    // Track user login
    trackUserLogin();
  }
}

// Show or hide password overlay
function showPasswordOverlay(show) {
  if (show) {
    passwordOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    // Focus on password input
    setTimeout(() => passwordInput.focus(), 100);
  } else {
    passwordOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
  }
}

// Handle unlock button click
unlockBtn.addEventListener('click', attemptUnlock);

// Handle enter key on password input
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    attemptUnlock();
  }
});

// Get the current regular password
async function getMasterPassword() {
  const storedPassword = localStorage.getItem('resenha_master_password');
  if (storedPassword) {
    return storedPassword;
  }
  
  try {
    const firebasePassword = await window.getMasterPasswordFromFirebase();
    localStorage.setItem('resenha_master_password', firebasePassword);
    return firebasePassword;
  } catch (error) {
    console.error('Error getting master password:', error);
    return MASTER_PASSWORD; // Fallback to default
  }
}

// Get the super master password for permanent access
async function getSuperMasterPassword() {
  const storedSuperPassword = localStorage.getItem('resenha_super_master_password');
  if (storedSuperPassword) {
    return storedSuperPassword;
  }
  
  try {
    const firebaseSuperPassword = await window.getSuperMasterPasswordFromFirebase();
    localStorage.setItem('resenha_super_master_password', firebaseSuperPassword);
    return firebaseSuperPassword;
  } catch (error) {
    console.error('Error getting super master password:', error);
    return 'resenha@admin'; // Fallback to default
  }
}

// Update master password (called from admin panel)
async function updateMasterPassword(newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
    console.error('Invalid password format');
    return false;
  }
  
  try {
    // Update in Firebase
    const success = await window.setMasterPasswordInFirebase(newPassword.trim());
    
    if (success) {
      // Also update in localStorage
      localStorage.setItem('resenha_master_password', newPassword.trim());
      console.log('Password updated successfully');
      return true;
    } else {
      console.error('Failed to update password in Firebase');
      return false;
    }
  } catch (error) {
    console.error('Error updating master password:', error);
    return false;
  }
}

// Update super master password (called from admin panel)
async function updateSuperMasterPassword(newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
    console.error('Invalid super master password format');
    return false;
  }
  
  try {
    // Update in Firebase
    const success = await window.setSuperMasterPasswordInFirebase(newPassword.trim());
    
    if (success) {
      // Also update in localStorage
      localStorage.setItem('resenha_super_master_password', newPassword.trim());
      console.log('Super master password updated successfully');
      return true;
    } else {
      console.error('Failed to update super master password in Firebase');
      return false;
    }
  } catch (error) {
    console.error('Error updating super master password:', error);
    return false;
  }
}

// Attempt to unlock with entered password
async function attemptUnlock() {
  try {
    console.log("Attempting to unlock...");
    const enteredPassword = passwordInput.value.trim();
    console.log("Password entered:", enteredPassword ? "***" : "(empty)");
    
    // Check if user is trying to use the master password (using the secret prefix)
    const isMasterPasswordAttempt = enteredPassword.startsWith(MASTER_PREFIX);
    
    if (isMasterPasswordAttempt) {
      // Strip the prefix to get the actual password attempt
      const attemptedMasterPassword = enteredPassword.substring(MASTER_PREFIX.length);
      
      // Verify against the super master password
      const superMasterPassword = await getSuperMasterPassword();
      
      if (attemptedMasterPassword === superMasterPassword) {
        console.log("Super master password correct, unlocking with permanent access...");
        // Grant permanent access
        localStorage.setItem('resenha_permanent_access', 'true');
        showPasswordOverlay(false);
        passwordError.textContent = '';
        passwordInput.value = '';
        
        // Track user login
        trackUserLogin();
        
        showNotification("Acesso permanente concedido!");
        console.log("Super master authentication successful");
      } else {
        console.log("Super master password incorrect");
        // Incorrect password - don't reveal it was a master password attempt
        passwordError.textContent = 'Senha incorreta. Tente novamente.';
        passwordInput.value = '';
        passwordInput.focus();
        
        // Shake animation for visual feedback
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
      }
    } else {
      // Regular daily password
      const currentMasterPassword = await getMasterPassword();
      
      if (enteredPassword === currentMasterPassword) {
        console.log("Daily password correct, unlocking...");
        // Correct password
        const currentDate = new Date().toDateString();
        localStorage.setItem('resenha_last_auth', currentDate);
        showPasswordOverlay(false);
        passwordError.textContent = '';
        passwordInput.value = '';
        
        // Track user login
        trackUserLogin();
        
        console.log("Daily authentication successful");
      } else {
        console.log("Daily password incorrect");
        // Incorrect password
        passwordError.textContent = 'Senha incorreta. Tente novamente.';
        passwordInput.value = '';
        passwordInput.focus();
        
        // Shake animation for visual feedback
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
      }
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    passwordError.textContent = 'Erro ao verificar senha. Tente novamente.';
  }
}

// Track user login for admin panel
function trackUserLogin() {
  const username = usernameInput.value.trim();
  
  // Generate device ID if none exists
  if (!localStorage.getItem('resenha_device_id')) {
    const deviceId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    localStorage.setItem('resenha_device_id', deviceId);
  }
  
  // Send message to admin panel if open
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({
        type: 'userLogin',
        username: username
      }, '*');
    } catch (e) {
      console.error('Error sending login data to admin panel:', e);
    }
  }
  
  // Store login in history
  try {
    const deviceId = localStorage.getItem('resenha_device_id');
    const today = new Date().toDateString();
    
    let history = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
    
    const existingUserIndex = history.findIndex(
      user => user.deviceId === deviceId && user.username === username
    );
    
    if (existingUserIndex >= 0) {
      // Update existing record
      history[existingUserIndex].lastAccess = today;
      history[existingUserIndex].accessCount += 1;
    } else {
      // Add new record
      history.push({
        deviceId,
        username,
        lastAccess: today,
        accessCount: 1
      });
    }
    
    localStorage.setItem('resenha_user_history', JSON.stringify(history));
  } catch (e) {
    console.error('Error updating user history:', e);
  }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Initialize with a random username if none exists
const storedUsername = localStorage.getItem('resenha_username');
if (storedUsername) {
  usernameInput.value = storedUsername;
} else {
  const defaultUsername = `Usuario_${Math.floor(Math.random() * 10000)}`;
  usernameInput.value = defaultUsername;
  localStorage.setItem('resenha_username', defaultUsername);
}

// Initialize sent messages array in localStorage if it doesn't exist
if (!localStorage.getItem('resenha_sent_message_ids')) {
  localStorage.setItem('resenha_sent_message_ids', JSON.stringify([]));
}

// Get list of message IDs sent by this user
function getSentMessageIds() {
  const stored = localStorage.getItem('resenha_sent_message_ids');
  return stored ? JSON.parse(stored) : [];
}

// Save username to localStorage when changed
usernameInput.addEventListener('change', () => {
  const newUsername = usernameInput.value.trim();
  if (newUsername) {
    localStorage.setItem('resenha_username', newUsername);
  }
});

// API calls replaced with Firebase functions
async function fetchMessages() {
  try {
    const messagesRef = window.database.ref('messages');
    const snapshot = await messagesRef.once('value');
    let messages = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      message.id = childSnapshot.key;
      messages.push(message);
    });
    
    // Sort by timestamp (newest last)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove messages older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    messages = messages.filter(msg => msg.timestamp > oneDayAgo);
    
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    showError('Falha ao carregar mensagens. Por favor, tente novamente mais tarde.');
    return [];
  }
}

// Handle username input
async function handleUsernameChange() {
  const username = usernameInput.value.trim();
  
  if (!username) {
    return; // Empty username, no need to check
  }
  
  // Check if username is already active
  const isActive = await window.isUsernameActive(username);
  
  if (isActive) {
    // Username is already in use
    showError(`O nome "${username}" já está sendo usado por outra pessoa. Escolha outro nome.`);
    usernameInput.classList.add('error');
    return false;
  } else {
    // Username is available
    usernameInput.classList.remove('error');
    
    // Register this username as active
    await window.registerActiveUsername(username);
    
    // Store the username in localStorage
    localStorage.setItem('resenha_username', username);
    
    return true;
  }
}

// Initialize username from localStorage
async function initUsername() {
  const savedUsername = localStorage.getItem('resenha_username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
    
    // Check if the saved username is still available
    const isActive = await window.isUsernameActive(savedUsername);
    
    if (!isActive) {
      // Register the saved username as active
      window.registerActiveUsername(savedUsername).catch(error => {
        console.error('Error registering saved username:', error);
      });
    } else {
      // Username is taken by someone else now
      // Add a number to make it unique
      const newUsername = `${savedUsername}_${Math.floor(Math.random() * 1000)}`;
      usernameInput.value = newUsername;
      localStorage.setItem('resenha_username', newUsername);
      
      // Register the new username
      window.registerActiveUsername(newUsername).catch(error => {
        console.error('Error registering new username:', error);
      });
      
      showError(`Seu nome "${savedUsername}" está sendo usado por outra pessoa. Atribuímos "${newUsername}" para você.`);
    }
  }
}

// Modify the send message function to check username availability
async function sendMessage(content) {
  try {
    const username = usernameInput.value.trim();
    if (!username) {
      showError('Por favor, defina seu nome de usuário.');
      usernameInput.focus();
      return;
    }
    
    // Check username availability before sending
    const isUsernameAvailable = await handleUsernameChange();
    if (!isUsernameAvailable) {
      usernameInput.focus();
      return; // Don't send if username is not available
    }

    if (!window.database) {
      showError('Firebase não está inicializado. Verifique sua conexão.');
      return;
    }
    
    const newMessageRef = window.database.ref('messages').push();
    
    await newMessageRef.set({
      content: content,
      username: username,
      timestamp: Date.now()
    });
    
    // Add message ID to sent messages
    const sentMessageIds = getSentMessageIds();
    sentMessageIds.push(newMessageRef.key);
    localStorage.setItem('resenha_sent_message_ids', JSON.stringify(sentMessageIds));
    
    return newMessageRef.key;
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Erro ao enviar mensagem: ' + error.message);
    throw error;
  }
}

// UI functions
function renderMessages(messages) {
  // Clear loading indicator
  messagesContainer.innerHTML = '';
  
  if (messages.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'loading-messages';
    emptyEl.innerHTML = `
      <i class="fas fa-comments"></i>
      <p>Nenhuma mensagem ainda. Seja o primeiro a dizer algo!</p>
    `;
    messagesContainer.appendChild(emptyEl);
    return;
  }
  
  // Sort messages by timestamp (newest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  // Get current username for styling
  const currentUsername = usernameInput.value.trim();
  
  // Get sent message IDs from localStorage
  const sentMessageIds = getSentMessageIds();
  
  // Render each message
  sortedMessages.forEach(message => {
    const messageWrapper = document.createElement('div');
    
    // Check if this message was sent by the current user
    // Either by matching username OR if the message ID is in our sent messages array
    const isOwnMessage = 
      currentUsername === message.username || 
      sentMessageIds.includes(message.id);
    
    messageWrapper.className = `message-wrapper ${isOwnMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`;
    
    const timestamp = new Date(message.timestamp);
    const formattedTime = formatTimestamp(timestamp);
    
    messageWrapper.innerHTML = `
      <div class="message ${isOwnMessage ? 'my-message' : 'other-message'}">
        <div class="message-time">${formattedTime}</div>
        <div class="message-user">${escapeHTML(message.username)}</div>
        <div class="message-content">${escapeHTML(message.content)}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageWrapper);
  });
}

function formatTimestamp(timestamp) {
  const messageDate = new Date(timestamp);
  
  // Retorna apenas a hora no formato HH:MM
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showError(message, duration = 3000) {
  // Create error notification if it doesn't exist
  let errorElement = document.getElementById('error-notification');
  
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'error-notification';
    document.body.appendChild(errorElement);
  }
  
  // Set message and show
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // Auto-hide after duration
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, duration);
}

function showNotification(message) {
  const notificationEl = document.createElement('div');
  notificationEl.className = 'notification';
  notificationEl.textContent = message;
  
  document.body.appendChild(notificationEl);
  
  // Remove the notification after 3 seconds
  setTimeout(() => {
    notificationEl.classList.add('fade-out');
    setTimeout(() => {
      notificationEl.remove();
    }, 500);
  }, 3000);
}

// Event listeners
sendMessageBtn.addEventListener('click', async () => {
  const content = messageInput.value.trim();
  
  if (!content) return;
  
  messageInput.value = '';
  
  const result = await sendMessage(content);
  
  if (result) {
    // Reload messages to show the new one
    loadMessages();
  }
});

messageInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessageBtn.click();
  }
});

// Add notification styles
const styleEl = document.createElement('style');
styleEl.textContent = `
  .error-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(180, 30, 30, 0.9);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    border-left: 3px solid #a03030;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  }
  
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(45, 55, 75, 0.9);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    border-left: 3px solid rgba(70, 90, 140, 0.7);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  }
  
  .notification.fade-out {
    opacity: 0;
    transition: opacity 0.5s ease-out;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(styleEl);

// Add real-time updates
function setupRealTimeUpdates() {
  const messagesRef = window.database.ref('messages');
  
  messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    message.id = snapshot.key;
    
    // Only render if it's a new message and not initial load
    if (document.querySelector(`.message-wrapper[data-id="${message.id}"]`)) {
      return;
    }
    
    // Check if message is less than 24 hours old
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (message.timestamp > oneDayAgo) {
      renderSingleMessage(message);
      
      // Scroll to bottom if user was already at bottom
      const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
      if (isAtBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  });
  
  // Remove expired messages (older than 24 hours)
  setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const messageElements = document.querySelectorAll('.message-wrapper');
    
    messageElements.forEach(element => {
      const timestamp = parseInt(element.getAttribute('data-timestamp'), 10);
      if (timestamp < oneDayAgo) {
        element.remove();
      }
    });
  }, 60000); // Check every minute
}

// Add a helper function to render a single message
function renderSingleMessage(message) {
  const sentMessageIds = getSentMessageIds();
  const isMyMessage = sentMessageIds.includes(message.id);
  
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message-wrapper ${isMyMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`;
  messageWrapper.setAttribute('data-id', message.id);
  messageWrapper.setAttribute('data-timestamp', message.timestamp);
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isMyMessage ? 'my-message' : 'other-message'}`;
  
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'message-user';
  usernameDiv.textContent = message.username;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = message.content;
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = formatTimestamp(message.timestamp);
  
  messageDiv.appendChild(usernameDiv);
  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timeDiv);
  messageWrapper.appendChild(messageDiv);
  
  // Add to DOM
  messagesContainer.insertBefore(messageWrapper, messagesContainer.firstChild);
}

// Clean up old messages periodically
async function cleanupOldMessages() {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const messagesRef = window.database.ref('messages');
    const snapshot = await messagesRef.once('value');
    
    const deletePromises = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.timestamp < oneDayAgo) {
        deletePromises.push(messagesRef.child(childSnapshot.key).remove());
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old messages`);
  } catch (error) {
    console.error('Error cleaning up old messages:', error);
  }
}

// Load messages function
async function loadMessages() {
  const messages = await fetchMessages();
  renderMessages(messages);
}

// Initialize the application
function init() {
  checkAuthStatus();
  
  // Set up event listeners
  sendMessageBtn.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (content) {
      try {
        await sendMessage(content);
        messageInput.value = '';
        messageInput.focus();
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  });
  
  messageInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = messageInput.value.trim();
      if (content) {
        try {
          await sendMessage(content);
          messageInput.value = '';
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  });
  
  // Add event listener for username input
  usernameInput.addEventListener('change', handleUsernameChange);
  usernameInput.addEventListener('blur', handleUsernameChange);
  
  retryFirebaseBtn.addEventListener('click', () => {
    window.location.reload();
  });
  
  // Load initial messages
  loadMessages();
  
  // Setup real-time updates
  setupRealTimeUpdates();
  
  // Initialize username from localStorage
  initUsername();
  
  // Setup inactive user cleanup
  window.setupInactiveUserCleanup();
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', init); 