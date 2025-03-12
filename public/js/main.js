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

// Track replied-to message
let replyingToMessage = null;

// Add username status indicator
let usernameStatusTimeout = null;
const usernameErrorDiv = document.querySelector('.username-error');
if (usernameErrorDiv) {
  // Create the error div if it doesn't exist yet
  if (!usernameErrorDiv.parentNode) {
    const userPanel = document.querySelector('.user-panel');
    if (userPanel) {
      userPanel.appendChild(usernameErrorDiv);
    }
  }
}

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
    // Don't immediately save to localStorage - we'll do this after validation
    handleUsernameChange();
  }
});

// Add input event for real-time validation
usernameInput.addEventListener('input', () => {
  const username = usernameInput.value.trim();
  
  // Clear any existing timeout to prevent multiple rapid checks
  if (usernameStatusTimeout) {
    clearTimeout(usernameStatusTimeout);
  }
  
  // Clear previous error/validation states
  hideUsernameMessages();
  
  // Skip validation for empty usernames
  if (!username) {
    return;
  }
  
  // Show "checking" status
  usernameInput.classList.remove('error');
  usernameInput.classList.remove('valid');
  usernameInput.classList.add('checking');
  
  showUsernameMessage('checking', 'Verificando disponibilidade...');
  
  // Debounce the check with a longer timeout to reduce database calls
  usernameStatusTimeout = setTimeout(() => {
    if (username) {
      handleUsernameChange();
    } else {
      // Empty username, hide all messages
      hideUsernameMessages();
    }
  }, 800); // Increased debounce time from 500ms to 800ms
});

// Helper functions for showing/hiding username validation messages
function showUsernameMessage(type, message) {
  if (!usernameErrorDiv) return;
  
  // Clear any existing classes
  usernameErrorDiv.className = 'username-error';
  
  // Add the specific type class
  usernameErrorDiv.classList.add(type);
  usernameErrorDiv.textContent = message;
  usernameErrorDiv.style.display = 'block';
}

function hideUsernameMessages() {
  if (!usernameErrorDiv) return;
  
  usernameInput.classList.remove('checking');
  usernameInput.classList.remove('valid');
  usernameInput.classList.remove('error');
  
  usernameErrorDiv.style.display = 'none';
  usernameErrorDiv.className = 'username-error';
}

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

// Handle username input with enhanced feedback
async function handleUsernameChange() {
  const username = usernameInput.value.trim();
  
  if (!username) {
    hideUsernameMessages();
    return true; // Empty username, no need to check
  }
  
  try {
    // Show checking status
    usernameInput.classList.add('checking');
    usernameInput.classList.remove('valid');
    usernameInput.classList.remove('error');
    
    showUsernameMessage('checking', 'Verificando disponibilidade...');
    
    // Check if username is already active
    const isActive = await window.isUsernameActive(username);
    
    if (isActive) {
      // Username is already in use
      usernameInput.classList.remove('checking');
      usernameInput.classList.add('error');
      usernameInput.classList.remove('valid');
      
      showUsernameMessage('error', `O nome "${username}" já está sendo usado.`);
      
      return false;
    } else {
      // Username is available - register it
      usernameInput.classList.remove('checking');
      usernameInput.classList.remove('error');
      usernameInput.classList.add('valid');
      
      showUsernameMessage('valid', `Nome "${username}" registrado.`);
      
      // Hide the success message after 3 seconds
      setTimeout(() => {
        if (usernameInput.classList.contains('valid')) {
          hideUsernameMessages();
        }
      }, 3000);
      
      // Register this username as active
      await window.registerActiveUsername(username);
      
      // Now it's safe to store in localStorage
      localStorage.setItem('resenha_username', username);
      
      return true;
    }
  } catch (error) {
    console.error('Error during username validation:', error);
    
    // Show error state
    usernameInput.classList.remove('checking');
    usernameInput.classList.add('error');
    usernameInput.classList.remove('valid');
    
    showUsernameMessage('error', 'Erro ao verificar disponibilidade.');
    
    return false;
  }
}

// Initialize username from localStorage with improved validation
async function initUsername() {
  const savedUsername = localStorage.getItem('resenha_username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
    
    try {
      // Ensure username meets length requirements
      if (savedUsername.length < 3 || savedUsername.length > 15) {
        createAndRegisterRandomUsername();
        return;
      }
      
      // Check if the saved username is still available
      const isActive = await window.isUsernameActive(savedUsername);
      
      if (!isActive) {
        // Username is available - register it
        await window.registerActiveUsername(savedUsername);
        
        // Show success state briefly
        usernameInput.classList.add('valid');
        showUsernameMessage('valid', `Nome "${savedUsername}" registrado.`);
        
        // Hide the success message after 3 seconds
        setTimeout(() => {
          if (usernameInput.classList.contains('valid')) {
            hideUsernameMessages();
          }
        }, 3000);
      } else {
        // Username is taken by someone else - generate a new one
        createAndRegisterRandomUsername(savedUsername);
      }
    } catch (error) {
      console.error('Error during username initialization:', error);
      createAndRegisterRandomUsername();
    }
  } else {
    // No saved username - generate a random one
    createAndRegisterRandomUsername();
  }
}

// Helper function to create and register a random username
async function createAndRegisterRandomUsername(baseUsername = null) {
  let newUsername = '';
  
  if (baseUsername) {
    // Try to create a username based on the existing one
    let attempts = 0;
    let isAvailable = false;
    
    // Try up to 5 different usernames (reduced from 10 to improve responsiveness)
    while (!isAvailable && attempts < 5) {
      // Ensure we generate a username that's not too long (max 15 chars)
      const baseName = baseUsername.length > 10 ? baseUsername.substring(0, 10) : baseUsername;
      newUsername = `${baseName}_${Math.floor(Math.random() * 999)}`;
      isAvailable = !(await window.isUsernameActive(newUsername));
      attempts++;
    }
    
    // If we couldn't find an available variation, create a completely random one
    if (!isAvailable) {
      newUsername = `User_${Math.floor(Math.random() * 9999)}`;
    }
  } else {
    // Generate a completely random username
    newUsername = `User_${Math.floor(Math.random() * 9999)}`;
  }
  
  // Set the new username
  usernameInput.value = newUsername;
  localStorage.setItem('resenha_username', newUsername);
  
  // Register the new username
  await window.registerActiveUsername(newUsername);
  
  // Show notification to user if it was a fallback from an existing username
  if (baseUsername) {
    showError(`Nome "${baseUsername}" já usado. Atribuímos "${newUsername}" para você.`);
  }
  
  // Show validation state
  usernameInput.classList.add('valid');
  showUsernameMessage('valid', `Nome "${newUsername}" registrado.`);
  
  // Hide the success message after 3 seconds
  setTimeout(() => {
    if (usernameInput.classList.contains('valid')) {
      hideUsernameMessages();
    }
  }, 3000);
}

// Send a new message
async function sendMessage() {
  const content = messageInput.value.trim();
  const username = usernameInput.value.trim();
  
  // Don't send if empty
  if (!content || !username) {
    if (!content) {
      messageInput.focus();
    } else if (!username) {
      usernameInput.focus();
    }
    return;
  }
  
  try {
    // Create message object
    const messageData = {
      content: content,
      username: username,
      timestamp: Date.now()
    };
    
    // Add reply info if replying to a message
    if (replyingToMessage) {
      messageData.replyTo = {
        id: replyingToMessage.id,
        username: replyingToMessage.username,
        content: replyingToMessage.content
      };
    }
    
    // Add to Firebase
    const messageRef = window.database.ref('messages').push();
    await messageRef.set(messageData);
    
    // Track this message as sent by this user
    trackSentMessage(messageRef.key);
    
    // Clear inputs and reply state
    messageInput.value = '';
    clearReplyState();
    
    // Ensure username is stored
    localStorage.setItem('resenha_username', username);
    
    // Update presence - this is now more efficient and doesn't require a full availability check
    window.updatePresence(username);
    
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Falha ao enviar mensagem. Por favor, tente novamente.');
  }
}

// Initialize reply to message functionality
function initReplyFunctionality() {
  // Listen for clicks on reply buttons
  document.addEventListener('click', event => {
    const replyButton = event.target.closest('.reply-button');
    if (replyButton) {
      const messageWrapper = replyButton.closest('.message-wrapper');
      const messageId = messageWrapper.getAttribute('data-id');
      
      // Find the message in the DOM to get its content
      const messageElement = messageWrapper.querySelector('.message');
      const messageUsername = messageElement.querySelector('.message-user').textContent;
      const messageContent = messageElement.querySelector('.message-content').textContent;
      
      // Set the replying to message
      replyingToMessage = {
        id: messageId,
        username: messageUsername,
        content: messageContent
      };
      
      // Show reply indicator
      showReplyIndicator(messageId, messageUsername, messageContent);
      
      // Focus on message input
      messageInput.focus();
    }
    
    // Handle cancel reply clicks
    if (event.target.closest('.cancel-reply')) {
      clearReplyState();
    }
  });
}

// Show reply indicator
function showReplyIndicator(messageId, username, content) {
  // Store the message we're replying to
  replyingToMessage = {
    id: messageId,
    username: username,
    content: content
  };
  
  let replyIndicator = document.querySelector('.reply-indicator-container');
  
  if (!replyIndicator) {
    replyIndicator = document.createElement('div');
    replyIndicator.className = 'reply-indicator-container';
    
    const messageInputContainer = document.querySelector('.message-input-container');
    messageInputContainer.appendChild(replyIndicator);
  }
  
  // Truncate content if too long
  const truncatedContent = content.length > 45 ? content.substring(0, 42) + '...' : content;
  
  replyIndicator.innerHTML = `
    <div class="reply-indicator">
      <div class="reply-indicator-sender">
        <i class="fas fa-reply"></i>
        <strong>${escapeHTML(username)}</strong>
      </div>
      <div class="reply-indicator-text">${escapeHTML(truncatedContent)}</div>
      <button class="cancel-reply" title="Cancelar resposta">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  // Add event listener to cancel button
  const cancelButton = replyIndicator.querySelector('.cancel-reply');
  if (cancelButton) {
    cancelButton.addEventListener('click', clearReplyState);
  }
  
  // Focus on the message input
  messageInput.focus();
}

// Clear the reply state
function clearReplyState() {
  replyingToMessage = null;
  
  // Remove reply indicator if exists
  const replyIndicator = document.querySelector('.reply-indicator-container');
  if (replyIndicator) {
    // Add the removing class for transition
    replyIndicator.classList.add('removing');
    
    // Wait for transition to complete before removing
    setTimeout(() => {
      if (replyIndicator.parentNode) {
        replyIndicator.parentNode.removeChild(replyIndicator);
      }
    }, 200); // Match transition duration in CSS
  }
}

// Modified renderMessages function to include reply functionality
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
  
  // Sort messages by timestamp (newest first for the column-reverse layout)
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
    messageWrapper.setAttribute('data-id', message.id);
    messageWrapper.setAttribute('data-timestamp', message.timestamp);
    
    // Create floating reply button (absolute positioned) 
    const replyButton = document.createElement('button');
    replyButton.className = 'reply-button';
    replyButton.title = 'Responder';
    replyButton.innerHTML = '<i class="fas fa-reply"></i>';
    
    // Add click event to reply button
    replyButton.addEventListener('click', () => {
      showReplyIndicator(message.id, message.username, message.content);
    });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'my-message' : 'other-message'}`;
    
    // Add reply indicator if this message is a reply
    if (message.replyTo) {
      const replyIndicator = document.createElement('div');
      replyIndicator.className = 'reply-indicator';
      replyIndicator.innerHTML = `
        <div class="reply-indicator-sender">
          <i class="fas fa-reply"></i>
          <strong>${escapeHTML(message.replyTo.username)}</strong>
        </div>
        <div class="reply-indicator-text">${escapeHTML(message.replyTo.content)}</div>
      `;
      messageDiv.appendChild(replyIndicator);
    }
    
    const formattedTime = formatTimestamp(new Date(message.timestamp));
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formattedTime;
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'message-user';
    usernameDiv.textContent = message.username;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message.content;
    
    messageDiv.appendChild(timeDiv);
    messageDiv.appendChild(usernameDiv);
    messageDiv.appendChild(contentDiv);
    
    messageWrapper.appendChild(replyButton);
    messageWrapper.appendChild(messageDiv);
    
    messagesContainer.appendChild(messageWrapper);
  });
}

// Modified renderSingleMessage function to include reply functionality
function renderSingleMessage(message) {
  const sentMessageIds = getSentMessageIds();
  const isMyMessage = sentMessageIds.includes(message.id);
  
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message-wrapper ${isMyMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`;
  messageWrapper.setAttribute('data-id', message.id);
  messageWrapper.setAttribute('data-timestamp', message.timestamp);
  
  // Create floating reply button (absolute positioned)
  const replyButton = document.createElement('button');
  replyButton.className = 'reply-button';
  replyButton.title = 'Responder';
  replyButton.innerHTML = '<i class="fas fa-reply"></i>';
  replyButton.addEventListener('click', function() {
    showReplyIndicator(message.id, message.username, message.content);
  });
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isMyMessage ? 'my-message' : 'other-message'}`;
  
  // Add reply indicator if this is a reply
  if (message.replyTo) {
    const replyIndicator = document.createElement('div');
    replyIndicator.className = 'reply-indicator';
    replyIndicator.innerHTML = `
      <div class="reply-indicator-sender">
        <i class="fas fa-reply"></i>
        <strong>${escapeHTML(message.replyTo.username)}</strong>
      </div>
      <div class="reply-indicator-text">${escapeHTML(message.replyTo.content)}</div>
    `;
    messageDiv.appendChild(replyIndicator);
  }
  
  const messageTime = document.createElement('div');
  messageTime.className = 'message-time';
  messageTime.textContent = formatTimestamp(new Date(message.timestamp));
  
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'message-user';
  usernameDiv.textContent = message.username;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = message.content;
  
  messageDiv.appendChild(messageTime);
  messageDiv.appendChild(usernameDiv);
  messageDiv.appendChild(contentDiv);
  
  messageWrapper.appendChild(replyButton);
  messageWrapper.appendChild(messageDiv);
  
  // Add to DOM
  messagesContainer.insertBefore(messageWrapper, messagesContainer.firstChild);
}

function formatTimestamp(timestamp) {
  const messageDate = new Date(timestamp);
  
  // Retorna apenas a hora no formato HH:MM
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// Event listeners for message sending
sendMessageBtn.addEventListener('click', () => {
  sendMessage();
});

// Keyboard events for message sending
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Prevent newline
    sendMessage();
  } else if (e.key === 'Escape' && replyingToMessage) {
    // Cancel reply with Escape key
    clearReplyState();
  }
});

// Function to add global event delegation for message interactions
function setupMessageInteractions() {
  // Add a single event listener with event delegation
  messagesContainer.addEventListener('click', (e) => {
    const replyButton = e.target.closest('.reply-button');
    if (replyButton) {
      // Find parent message wrapper
      const messageWrapper = replyButton.closest('.message-wrapper');
      if (messageWrapper) {
        const messageId = messageWrapper.getAttribute('data-id');
        const messageDiv = messageWrapper.querySelector('.message');
        const username = messageDiv.querySelector('.message-user').textContent;
        const content = messageDiv.querySelector('.message-content').textContent;
        
        // Show reply indicator above message input
        showReplyIndicator(messageId, username, content);
      }
    }
  });
}

// Initialize the app
async function initApp() {
  // Setup Firebase
  try {
    await window.initializeFirebase();
    
    // Check password protection
    checkAuthStatus();
    
    // Initialize the enhanced presence system
    if (window.setupPresenceSystem) {
      window.setupPresenceSystem();
    }
    
    // Setup username with the improved system
    await initUsername();
    
    // Setup inactive user cleanup
    if (window.setupInactiveUserCleanup) {
      window.setupInactiveUserCleanup();
    }
    
    // Listen for new messages
    listenToMessages();
    
    // Setup message interactions
    setupMessageInteractions();
    
    // Add event listener for updating presence when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Update presence when tab becomes visible again
        const username = localStorage.getItem('resenha_username');
        if (username) {
          window.updatePresence(username);
        }
      }
    });
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Erro ao inicializar o aplicativo. Verifique sua conexão e tente novamente.');
  }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initApp);

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

// Track sent messages in localStorage
function trackSentMessage(messageId) {
  const sentMessageIds = getSentMessageIds();
  sentMessageIds.push(messageId);
  
  // Keep only the most recent 100 messages
  if (sentMessageIds.length > 100) {
    sentMessageIds.splice(0, sentMessageIds.length - 100);
  }
  
  localStorage.setItem('resenha_sent_message_ids', JSON.stringify(sentMessageIds));
}

// Listen for new messages
function listenToMessages() {
  const messagesRef = window.database.ref('messages');
  
  // Initial load of messages
  loadMessages();
  
  // Real-time updates for new messages
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

// Load messages
async function loadMessages() {
  const messages = await fetchMessages();
  renderMessages(messages);
} 