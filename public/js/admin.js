// Admin page functionality

// DOM Elements
const adminLoginOverlay = document.getElementById('admin-login-overlay');
const adminPanel = document.getElementById('admin-panel');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');
const logoutAdminBtn = document.getElementById('logout-admin-btn');

// Password management elements
const currentPasswordDisplay = document.getElementById('current-password');
const togglePasswordVisibilityBtn = document.getElementById('toggle-password-visibility');
const newPasswordInput = document.getElementById('new-password');
const updatePasswordBtn = document.getElementById('update-password-btn');
const passwordTimingSelector = document.getElementById('password-timing-selector');
const updateNowContainer = document.getElementById('update-now-container');
const scheduleContainer = document.getElementById('schedule-container');
const scheduledDateInput = document.getElementById('scheduled-date');
const scheduledPasswordInput = document.getElementById('scheduled-password');
const schedulePasswordBtn = document.getElementById('schedule-password-btn');
const scheduledPasswordsList = document.getElementById('scheduled-passwords-list');
const scheduledPasswordsCard = document.getElementById('scheduled-passwords-card');

// User history elements
const historyFilterSelect = document.getElementById('history-filter');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');
const userHistoryData = document.getElementById('user-history-data');

// Emergency delete elements
const emergencyDeleteBtn = document.getElementById('emergency-delete-btn');
const deleteConfirmation = document.getElementById('delete-confirmation');
const deleteConfirmationInput = document.getElementById('delete-confirmation-input');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// User activity elements
const refreshActivityBtn = document.getElementById('refresh-activity-btn');
const activeUsersContainer = document.getElementById('active-users-container');
const devicesContainer = document.getElementById('devices-container');

// Constants
const ADMIN_PASSWORD = "bolinho123"; // Secure admin password with mixed characters

// Initialize the admin page
async function initAdminPage() {
  // Set the minimum date for scheduling to today
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  scheduledDateInput.min = formattedDate;
  scheduledDateInput.value = formattedDate;
  
  // Clear any sample user history data that might be present
  clearSampleUserHistory();
  
  // Initialize password selector
  setupPasswordSelector();
  
  // Load current password (now async)
  await loadCurrentPassword();
  
  // Load scheduled passwords
  loadScheduledPasswords();
  
  // Load user activity
  loadUserActivity();
  
  // Setup password visibility toggle
  setupPasswordVisibility();
}

// Setup password selector for toggling between now and schedule
function setupPasswordSelector() {
  passwordTimingSelector.addEventListener('change', function() {
    if (this.value === 'now') {
      updateNowContainer.style.display = 'block';
      scheduleContainer.style.display = 'none';
    } else {
      updateNowContainer.style.display = 'none';
      scheduleContainer.style.display = 'block';
    }
  });
}

// Password visibility toggle functionality
function setupPasswordVisibility() {
  togglePasswordVisibilityBtn.addEventListener('click', togglePasswordVisibility);
}

// Schedule password related functions
async function loadScheduledPasswords() {
  const scheduledPasswords = getScheduledPasswords();
  
  // Clear the current list
  scheduledPasswordsList.innerHTML = '';
  
  // Hide the card if no scheduled passwords
  if (scheduledPasswords.length === 0) {
    scheduledPasswordsCard.style.display = 'none';
    return;
  }
  
  // Show the card and populate the list
  scheduledPasswordsCard.style.display = 'block';
  
  // Sort by date (ascending)
  scheduledPasswords.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Create elements for each scheduled password
  scheduledPasswords.forEach(({ date, password }) => {
    const item = document.createElement('div');
    item.className = 'scheduled-password-item';
    
    const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    item.innerHTML = `
      <div class="scheduled-password-info">
        <span class="scheduled-password-date">${formattedDate}</span>
        <span class="scheduled-password-value">•••••••</span>
      </div>
      <button class="delete-scheduled-btn" data-date="${date}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    scheduledPasswordsList.appendChild(item);
    
    // Add event listener to delete button
    const deleteBtn = item.querySelector('.delete-scheduled-btn');
    deleteBtn.addEventListener('click', () => deleteScheduledPassword(date));
  });
}

// User Activity related functions
function loadUserActivity() {
  // Load active users
  loadActiveUsers();
  
  // Load device history
  loadDeviceHistory();
  
  // Set up refresh button
  refreshActivityBtn.addEventListener('click', () => {
    loadActiveUsers();
    loadDeviceHistory();
  });
}

function loadActiveUsers() {
  // In a real app, this would fetch from the database
  // For now, we'll just use localStorage data
  
  // Clear current content
  activeUsersContainer.innerHTML = '';
  
  const userHistory = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
  
  // Filter to only show users active today
  const today = new Date().toDateString();
  const activeUsers = userHistory.filter(user => {
    const lastAccessDate = new Date(user.lastAccess).toDateString();
    return lastAccessDate === today;
  });
  
  if (activeUsers.length === 0) {
    activeUsersContainer.innerHTML = `
      <div class="no-data-message">Nenhum usuário ativo no momento</div>
    `;
    return;
  }
  
  // Create elements for each active user
  activeUsers.forEach(user => {
    const userElem = document.createElement('div');
    userElem.className = 'device-entry';
    userElem.innerHTML = `
      <div class="device-info">
        <span class="device-id">${user.deviceId.substring(0, 8)}...</span>
        <span class="current-username">${user.username}</span>
      </div>
    `;
    activeUsersContainer.appendChild(userElem);
  });
}

function loadDeviceHistory() {
  // Clear current content
  devicesContainer.innerHTML = '';
  
  const userHistory = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
  
  if (userHistory.length === 0) {
    devicesContainer.innerHTML = `
      <div class="no-data-message">Nenhum dispositivo registrado</div>
    `;
    return;
  }
  
  // Group by device ID
  const deviceGroups = {};
  userHistory.forEach(user => {
    if (!deviceGroups[user.deviceId]) {
      deviceGroups[user.deviceId] = [];
    }
    deviceGroups[user.deviceId].push({
      username: user.username,
      lastAccess: user.lastAccess
    });
  });
  
  // Create elements for each device
  Object.entries(deviceGroups).forEach(([deviceId, usernameHistory]) => {
    // Sort by lastAccess (most recent first)
    usernameHistory.sort((a, b) => new Date(b.lastAccess) - new Date(a.lastAccess));
    
    const deviceElem = document.createElement('div');
    deviceElem.className = 'device-entry';
    
    // Get the most recent username
    const currentUsername = usernameHistory[0].username;
    
    // Create the history popup
    let historyPopupHTML = '';
    usernameHistory.forEach(entry => {
      const date = new Date(entry.lastAccess).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      historyPopupHTML += `
        <div class="history-entry">${entry.username} (Último: ${date})</div>
      `;
    });
    
    deviceElem.innerHTML = `
      <div class="device-info">
        <span class="device-id">${deviceId.substring(0, 8)}...</span>
        <span class="current-username">${currentUsername}</span>
      </div>
      <div class="username-history" title="Histórico de nomes">
        <i class="fas fa-history"></i>
        <div class="history-popup">
          ${historyPopupHTML}
        </div>
      </div>
    `;
    
    devicesContainer.appendChild(deviceElem);
  });
}

// Authentication functions
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem('resenha_admin_auth') === 'true';
  if (isAuthenticated) {
    showAdminPanel(true);
  } else {
    showAdminPanel(false);
  }
}

function showAdminPanel(show) {
  if (show) {
    adminLoginOverlay.style.display = 'none';
    adminPanel.style.display = 'flex';
    initAdminPage();
  } else {
    adminLoginOverlay.style.display = 'flex';
    adminPanel.style.display = 'none';
    setTimeout(() => adminPasswordInput.focus(), 100);
  }
}

function attemptAdminLogin() {
  const enteredPassword = adminPasswordInput.value.trim();
  
  if (enteredPassword === ADMIN_PASSWORD) {
    // Correct password
    sessionStorage.setItem('resenha_admin_auth', 'true');
    showAdminPanel(true);
    adminLoginError.textContent = '';
    adminPasswordInput.value = '';
  } else {
    // Incorrect password
    adminLoginError.textContent = 'Senha administrativa incorreta.';
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
    
    // Shake animation for visual feedback
    adminPasswordInput.classList.add('shake');
    setTimeout(() => adminPasswordInput.classList.remove('shake'), 500);
  }
}

// Password management functions
// Load the current password from Firebase or localStorage
async function loadCurrentPassword() {
  try {
    // Try to get password from Firebase first
    const passwordRef = window.database.ref('adminSettings/masterPassword');
    const snapshot = await passwordRef.once('value');
    let currentPassword = snapshot.val() || 'resenha123'; // Default fallback
    
    // Store it in localStorage as well
    localStorage.setItem('resenha_master_password', currentPassword);
    
    // Update the display with hidden characters initially
    currentPasswordDisplay.dataset.password = currentPassword;
    currentPasswordDisplay.textContent = '••••••••••';
  } catch (error) {
    console.error('Error loading password from Firebase:', error);
    
    // Fallback to localStorage
    const storedPassword = localStorage.getItem('resenha_master_password') || 'resenha123';
    currentPasswordDisplay.dataset.password = storedPassword;
    currentPasswordDisplay.textContent = '••••••••••';
  }
}

function togglePasswordVisibility() {
  const passwordValue = currentPasswordDisplay.dataset.password;
  const eyeIcon = togglePasswordVisibilityBtn.querySelector('i');
  
  if (currentPasswordDisplay.textContent === '••••••••••') {
    currentPasswordDisplay.textContent = passwordValue;
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    currentPasswordDisplay.textContent = '••••••••••';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
}

async function updatePassword() {
  const newPassword = newPasswordInput.value.trim();
  
  if (newPassword) {
    try {
      // Update in Firebase
      await window.database.ref('adminSettings/masterPassword').set(newPassword);
      
      // Also update in localStorage
      localStorage.setItem('resenha_master_password', newPassword);
      
      // Update the display
      currentPasswordDisplay.dataset.password = newPassword;
      if (currentPasswordDisplay.textContent !== '••••••••••') {
        currentPasswordDisplay.textContent = newPassword;
      }
      
      // Clear the input
      newPasswordInput.value = '';
      
      // Update the main app if it's open
      updateMainAppPassword();
      
      // Show notification
      showNotification('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification('Erro ao atualizar senha.', true);
    }
  } else {
    showNotification('Por favor, insira uma nova senha.', true);
  }
}

function schedulePassword() {
  const date = scheduledDateInput.value;
  const password = scheduledPasswordInput.value.trim();
  
  if (!date) {
    showNotification('Por favor, selecione uma data.', true);
    return;
  }
  
  if (!password) {
    showNotification('Por favor, insira uma senha.', true);
    return;
  }
  
  // Get existing scheduled passwords
  const scheduledPasswords = getScheduledPasswords();
  
  // Check if there's already a password for this date
  const existingIndex = scheduledPasswords.findIndex(item => item.date === date);
  if (existingIndex >= 0) {
    scheduledPasswords[existingIndex].password = password;
  } else {
    scheduledPasswords.push({ date, password });
  }
  
  // Save updated list
  saveScheduledPasswords(scheduledPasswords);
  
  // Clear inputs
  scheduledPasswordInput.value = '';
  
  // Refresh the list
  loadScheduledPasswords();
  
  // Show notification
  showNotification('Senha programada com sucesso!');
}

function deleteScheduledPassword(date) {
  let scheduledPasswords = getScheduledPasswords();
  scheduledPasswords = scheduledPasswords.filter(item => item.date !== date);
  saveScheduledPasswords(scheduledPasswords);
  loadScheduledPasswords();
  showNotification('Senha programada removida!');
}

function getScheduledPasswords() {
  try {
    return JSON.parse(localStorage.getItem('resenha_scheduled_passwords')) || [];
  } catch (e) {
    console.error('Error parsing scheduled passwords', e);
    return [];
  }
}

function saveScheduledPasswords(passwords) {
  localStorage.setItem('resenha_scheduled_passwords', JSON.stringify(passwords));
}

// User history functions
function loadUserHistory() {
  const filter = historyFilterSelect.value;
  const userHistory = getUserHistoryData();
  
  // Clear current data
  userHistoryData.innerHTML = '';
  
  // Filter data if needed
  let filteredHistory = userHistory;
  if (filter === 'active') {
    const today = new Date().toDateString();
    filteredHistory = userHistory.filter(user => user.lastAccess === today);
  }
  
  // Sort by last access (most recent first)
  filteredHistory.sort((a, b) => {
    const dateA = new Date(a.lastAccess);
    const dateB = new Date(b.lastAccess);
    return dateB - dateA;
  });
  
  // Create rows for each user
  filteredHistory.forEach(user => {
    const row = document.createElement('tr');
    
    // Ensure we create a valid date object
    const lastAccessDate = new Date(user.lastAccess);
    // Check if the date is valid before formatting
    const formattedDate = !isNaN(lastAccessDate.getTime()) 
      ? lastAccessDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
        })
      : 'Data inválida';
    
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.deviceId.substring(0, 8)}...</td>
      <td>${formattedDate}</td>
      <td>${user.accessCount}</td>
    `;
    
    userHistoryData.appendChild(row);
  });
  
  // Show message if no users
  if (filteredHistory.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="4" style="text-align: center; font-style: italic;">Ainda não há histórico de usuários. Quando alguém acessar o chat, os dados aparecerão aqui.</td>`;
    userHistoryData.appendChild(emptyRow);
  }
}

function getUserHistoryData() {
  // Get actual user history data from localStorage
  try {
    let history = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
    
    // No sample data generation - just return the actual history
    return history;
  } catch (e) {
    console.error('Error parsing user history', e);
    return [];
  }
}

// Helper functions
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getDeviceId() {
  let deviceId = localStorage.getItem('resenha_device_id');
  if (!deviceId) {
    deviceId = generateRandomId();
    localStorage.setItem('resenha_device_id', deviceId);
  }
  return deviceId;
}

// Show notification function
function showNotification(message, isError = false) {
  // Add CSS for notifications if not already added
  if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
    style.id = 'notification-styles';
  style.textContent = `
    .admin-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-size: 0.9rem;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 9999;
    }
    
    .admin-notification.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .admin-notification.success {
      background-color: #28a745;
    }
    
    .admin-notification.error {
      background-color: #dc3545;
    }
  `;
  document.head.appendChild(style);
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `admin-notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Event listeners
adminLoginBtn.addEventListener('click', attemptAdminLogin);
adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    attemptAdminLogin();
  }
});

logoutAdminBtn.addEventListener('click', () => {
  sessionStorage.removeItem('resenha_admin_auth');
  showAdminPanel(false);
});

togglePasswordVisibilityBtn.addEventListener('click', togglePasswordVisibility);
updatePasswordBtn.addEventListener('click', updatePassword);
schedulePasswordBtn.addEventListener('click', schedulePassword);

historyFilterSelect.addEventListener('change', loadUserHistory);
refreshHistoryBtn.addEventListener('click', loadUserHistory);

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Initial admin auth check
  checkAdminAuth();
  
  // Setup event listeners
  adminLoginBtn.addEventListener('click', attemptAdminLogin);
  adminPasswordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') attemptAdminLogin();
  });
  
  logoutAdminBtn.addEventListener('click', () => {
    sessionStorage.removeItem('resenha_admin_auth');
    showAdminPanel(false);
  });
  
  updatePasswordBtn.addEventListener('click', updatePassword);
  schedulePasswordBtn.addEventListener('click', schedulePassword);
  
  // Setup emergency delete functionality
  setupEmergencyDelete();
  
  // Init the app
  initAdminPage();
});

// Background task to check for scheduled passwords
function checkScheduledPasswords() {
  const today = new Date().toISOString().split('T')[0];
  const scheduledPasswords = getScheduledPasswords();
  
  // Check if there's a password scheduled for today
  const todayPassword = scheduledPasswords.find(item => item.date === today);
  
  if (todayPassword) {
    // Update the current password
    localStorage.setItem('resenha_master_password', todayPassword.password);
    
    // Remove this scheduled password
    const updatedSchedules = scheduledPasswords.filter(item => item.date !== today);
    saveScheduledPasswords(updatedSchedules);
    
    console.log('Password updated to scheduled password for today.');
    
    // If admin panel is open, refresh the display
    if (adminPanel.style.display !== 'none') {
      loadCurrentPassword();
      loadScheduledPasswords();
    }
  }
}

// Check for scheduled passwords when the page loads
document.addEventListener('DOMContentLoaded', checkScheduledPasswords);

// Update the main app's password checking function
function updateMainAppPassword() {
  // This function modifies main.js to use the password from localStorage
  if (window.opener && !window.opener.closed) {
    try {
      // Try to access the opener window (main app)
      window.opener.updateMasterPassword();
    } catch (e) {
      console.error('Could not update password in main app:', e);
    }
  }
}

// Emergency Delete All Messages
function setupEmergencyDelete() {
  emergencyDeleteBtn.addEventListener('click', () => {
    deleteConfirmation.style.display = 'block';
    emergencyDeleteBtn.style.display = 'none';
  });
  
  cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmation.style.display = 'none';
    emergencyDeleteBtn.style.display = 'flex';
    deleteConfirmationInput.value = '';
  });
  
  confirmDeleteBtn.addEventListener('click', deleteAllMessages);
  
  // Also allow Enter key to confirm
  deleteConfirmationInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      deleteAllMessages();
    }
  });
}

async function deleteAllMessages() {
  const confirmText = deleteConfirmationInput.value.trim();
  
  if (confirmText !== 'CONFIRMAR') {
    showNotification('Digite "CONFIRMAR" para prosseguir com a exclusão', true);
    return;
  }
  
  try {
    // Get reference to all messages
    const messagesRef = firebase.database().ref('messages');
    
    // Remove all messages
    await messagesRef.remove();
    
    // Reset UI
    deleteConfirmation.style.display = 'none';
    emergencyDeleteBtn.style.display = 'flex';
    deleteConfirmationInput.value = '';
    
    // Show success notification
    showNotification('Todas as mensagens foram excluídas com sucesso!');
    
    // Log this critical action
    logAdminAction('delete_all_messages');
  } catch (error) {
    console.error('Error deleting messages:', error);
    showNotification('Erro ao excluir mensagens: ' + error.message, true);
  }
}

function logAdminAction(action) {
  try {
    const actionsRef = firebase.database().ref('admin_actions');
    actionsRef.push({
      action,
      timestamp: Date.now(),
      admin: 'Admin', // You could store admin username here if you have that functionality
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

// Track user logins
function trackUserLogins() {
  window.addEventListener('message', function(event) {
    // Check origin for security
    if (event.data && event.data.type === 'userLogin') {
      const { username } = event.data;
      const deviceId = getDeviceId();
      const today = new Date().toDateString();
      
      // Get current history
      let history = getUserHistoryData();
      
      // Find this device/user combination
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
      
      // Save updated history
      localStorage.setItem('resenha_user_history', JSON.stringify(history));
      
      // Refresh display if admin panel is open
      if (adminPanel.style.display !== 'none') {
        loadUserHistory();
      }
    }
  });
}

// Clear any sample user history that was generated previously
function clearSampleUserHistory() {
  const currentHistory = JSON.parse(localStorage.getItem('resenha_user_history') || '[]');
  
  // Check if this looks like sample data (has future dates or names that match our sample list)
  const sampleNames = ['Pedro', 'Ana', 'Carlos', 'Julia', 'Marcos'];
  const hasSampleData = currentHistory.some(entry => {
    const entryDate = new Date(entry.lastAccess);
    const now = new Date();
    // Check if date is in the future or if name is from our sample list
    return entryDate > now || sampleNames.includes(entry.username);
  });
  
  if (hasSampleData) {
    // Clear the history data
    localStorage.setItem('resenha_user_history', '[]');
    console.log('Cleared sample user history data');
  }
} 