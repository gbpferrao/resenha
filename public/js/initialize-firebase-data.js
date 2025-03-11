// Initialize Firebase Database Structure
// This script sets up the initial database structure for Resenha Chat
// Run this script once after setting up a new Firebase project

document.addEventListener('DOMContentLoaded', async function() {
  // Check if Firebase is initialized
  if (typeof firebase === 'undefined' || !window.database) {
    console.error('Firebase is not initialized properly');
    alert('Firebase não está inicializado. Verifique sua conexão e configuração.');
    return;
  }

  try {
    // Create initialization status display
    const statusDiv = document.createElement('div');
    statusDiv.id = 'init-status';
    statusDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: white; padding: 20px; border-radius: 8px; font-family: Arial; max-width: 80%; text-align: center;';
    document.body.appendChild(statusDiv);
    
    function updateStatus(message) {
      statusDiv.innerHTML += `<p>${message}</p>`;
      console.log(message);
    }
    
    updateStatus('Iniciando configuração do banco de dados...');
    
    // 1. Set up admin settings
    updateStatus('Configurando senhas padrão...');
    await window.database.ref('adminSettings').set({
      masterPassword: 'resenha123',
      superMasterPassword: 'resenha@admin'
    });
    
    // 2. Create a welcome message
    updateStatus('Criando mensagem de boas-vindas...');
    await window.database.ref('messages').push({
      username: 'Sistema',
      content: 'Bem-vindo ao Resenha Chat! Este é um novo chat criado para você.',
      timestamp: Date.now()
    });
    
    // 3. Initialize active users node
    updateStatus('Inicializando nó de usuários ativos...');
    await window.database.ref('activeUsers').set({});
    
    // 4. Initialize user history
    updateStatus('Inicializando histórico de usuários...');
    await window.database.ref('userHistory').set({});
    
    // Success message
    updateStatus('Banco de dados inicializado com sucesso! ✅');
    updateStatus('Você pode atualizar a página e começar a usar o app.');
    
    // Add a button to reload
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Recarregar Aplicativo';
    reloadBtn.style.cssText = 'margin-top: 20px; padding: 10px 20px; background: #3a4461; color: white; border: none; border-radius: 4px; cursor: pointer;';
    reloadBtn.onclick = function() {
      window.location.reload();
    };
    statusDiv.appendChild(reloadBtn);
    
  } catch (error) {
    console.error('Error initializing database:', error);
    const statusDiv = document.getElementById('init-status');
    if (statusDiv) {
      statusDiv.innerHTML += `<p style="color: #cf4040;">Erro ao inicializar banco de dados: ${error.message}</p>`;
    } else {
      alert(`Erro ao inicializar banco de dados: ${error.message}`);
    }
  }
}); 