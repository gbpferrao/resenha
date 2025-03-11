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

// Emergency delete elements
const emergencyDeleteBtn = document.getElementById('emergency-delete-btn');
const deleteConfirmation = document.getElementById('delete-confirmation');
const deleteConfirmationInput = document.getElementById('delete-confirmation-input');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Constants
const ADMIN_PASSWORD = "bolinho123"; // Secure admin password with mixed characters

// Initialize the admin page
async function initAdminPage() {
  // Load current password
  await loadCurrentPassword();
  
  // Setup password visibility toggle
  setupPasswordVisibility();
  
  // Setup emergency delete
  setupEmergencyDelete();
}

// Password visibility toggle functionality
function setupPasswordVisibility() {
  togglePasswordVisibilityBtn.addEventListener('click', togglePasswordVisibility);
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
      admin: 'Admin',
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

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
  
  // Init the app
  initAdminPage();
}); 