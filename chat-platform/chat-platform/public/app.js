// ========================================
// VARIABLES GLOBALES
// ========================================

let currentUser = null;
let socket = null;
let currentConversation = null;

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si l'utilisateur est déjà connecté
  const savedUser = localStorage.getItem('chatUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showMainPage();
    } catch (e) {
      localStorage.removeItem('chatUser');
    }
  }

  setupEventListeners();
});

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Tabs d'authentification
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Formulaires
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);

  // Déconnexion
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Recherche
  document.getElementById('user-search').addEventListener('input', debounce(handleSearch, 500));
  document.getElementById('search-btn').addEventListener('click', handleSearch);

  // Messages
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('send-btn').addEventListener('click', sendMessage);

  // Fermer le chat
  document.getElementById('close-chat').addEventListener('click', closeChat);
}

// ========================================
// AUTHENTIFICATION
// ========================================

function switchTab(tabName) {
  // Activer le bon tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Afficher le bon formulaire
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`${tabName}-form`).classList.add('active');

  // Réinitialiser le message
  showMessage('', '');
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showMessage('error', 'Veuillez remplir tous les champs');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data;
      localStorage.setItem('chatUser', JSON.stringify(data));
      showMainPage();
    } else {
      showMessage('error', data.error || 'Erreur de connexion');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('error', 'Impossible de se connecter au serveur');
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;

  if (!username || !password) {
    showMessage('error', 'Veuillez remplir tous les champs');
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage('success', 'Compte créé ! Connectez-vous maintenant.');
      setTimeout(() => {
        switchTab('login');
        document.getElementById('login-username').value = username;
      }, 1500);
    } else {
      showMessage('error', data.error || 'Erreur lors de l\'inscription');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('error', 'Impossible de se connecter au serveur');
  }
}

function handleLogout() {
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
    localStorage.removeItem('chatUser');
    if (socket) socket.disconnect();
    location.reload();
  }
}

function showMessage(type, message) {
  const messageEl = document.getElementById('auth-message');
  messageEl.className = `message ${type}`;
  messageEl.textContent = message;
}

// ========================================
// PAGE PRINCIPALE
// ========================================

function showMainPage() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('main-page').classList.add('active');

  // Afficher les infos utilisateur
  document.getElementById('username-display').textContent = currentUser.username;
  document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();

  // Initialiser Socket.io
  initSocket();

  // Charger les données
  loadConversations();
  loadNotifications();
}

// ========================================
// SOCKET.IO
// ========================================

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('✅ Connecté au serveur');
    socket.emit('register', currentUser.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Déconnecté du serveur');
  });

  socket.on('notification', (data) => {
    loadNotifications();
    showToast(`📩 ${data.message}`);
  });

  socket.on('new-message', (message) => {
    if (currentConversation && message.conversationId === currentConversation.id) {
      displayMessage(message);
    }
  });
}

// ========================================
// RECHERCHE D'UTILISATEURS
// ========================================

async function handleSearch() {
  const query = document.getElementById('user-search').value.trim();
  const resultsContainer = document.getElementById('search-results');

  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`/api/users/search/${currentUser.id}/${encodeURIComponent(query)}`);
    const users = await response.json();

    resultsContainer.innerHTML = '';

    if (users.length === 0) {
      resultsContainer.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);">Aucun utilisateur trouvé</div>';
      return;
    }

    users.forEach(user => {
      const userEl = createUserItem(user);
      resultsContainer.appendChild(userEl);
    });
  } catch (error) {
    console.error('Erreur recherche:', error);
  }
}

function createUserItem(user) {
  const div = document.createElement('div');
  div.className = 'user-item';
  div.innerHTML = `
    <div class="item-avatar">${user.username[0].toUpperCase()}</div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(user.username)}</div>
    </div>
    <button class="btn-invite" onclick="sendInvitation(${user.id}, '${escapeHtml(user.username)}')">
      Inviter
    </button>
  `;
  return div;
}

async function sendInvitation(targetUserId, targetUsername) {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, targetUserId })
    });

    const data = await response.json();

    if (response.ok) {
      showToast(data.existing ? 
        `Conversation avec ${targetUsername} déjà existante` : 
        `Invitation envoyée à ${targetUsername} ✅`
      );
      openConversation(data.id, targetUsername);
      loadConversations();
      document.getElementById('user-search').value = '';
      document.getElementById('search-results').innerHTML = '';
    }
  } catch (error) {
    console.error('Erreur invitation:', error);
    showToast('Erreur lors de l\'envoi de l\'invitation ❌');
  }
}

// ========================================
// CONVERSATIONS
// ========================================

async function loadConversations() {
  try {
    const response = await fetch(`/api/conversations/${currentUser.id}`);
    const conversations = await response.json();

    const container = document.getElementById('conversations-list');
    container.innerHTML = '';

    conversations.forEach(conv => {
      const convEl = createConversationItem(conv);
      container.appendChild(convEl);
    });
  } catch (error) {
    console.error('Erreur chargement conversations:', error);
  }
}

function createConversationItem(conv) {
  const div = document.createElement('div');
  div.className = 'conv-item';
  div.innerHTML = `
    <div class="item-avatar">${conv.participants[0].toUpperCase()}</div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(conv.participants)}</div>
      <div class="item-time">${formatDate(conv.createdAt)}</div>
    </div>
  `;
  div.onclick = () => openConversation(conv.id, conv.participants);
  return div;
}

async function openConversation(conversationId, title) {
  currentConversation = { id: conversationId, title };

  // Afficher l'interface de chat
  document.getElementById('welcome-screen').classList.remove('active');
  document.getElementById('chat-screen').classList.add('active');
  document.getElementById('chat-title').textContent = title;

  // Rejoindre la conversation
  socket.emit('join-conversation', conversationId);

  // Charger les messages
  await loadMessages(conversationId);
}

async function loadMessages(conversationId) {
  try {
    const response = await fetch(`/api/messages/${conversationId}`);
    const messages = await response.json();

    const container = document.getElementById('messages-area');
    container.innerHTML = '';

    messages.forEach(message => {
      displayMessage(message);
    });

    scrollToBottom();
  } catch (error) {
    console.error('Erreur chargement messages:', error);
  }
}

function displayMessage(message) {
  const container = document.getElementById('messages-area');
  const isOwn = message.userId === currentUser.id;

  const div = document.createElement('div');
  div.className = `message-item ${isOwn ? 'own' : ''}`;
  div.innerHTML = `
    <div class="message-bubble">
      ${!isOwn ? `<div class="message-author">${escapeHtml(message.username)}</div>` : ''}
      <div class="message-text">${escapeHtml(message.message)}</div>
      <div class="message-time">${formatTime(message.createdAt)}</div>
    </div>
  `;

  container.appendChild(div);
  scrollToBottom();
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();

  if (!message || !currentConversation) return;

  socket.emit('send-message', {
    conversationId: currentConversation.id,
    userId: currentUser.id,
    message
  });

  input.value = '';
  input.focus();
}

function closeChat() {
  currentConversation = null;
  document.getElementById('welcome-screen').classList.add('active');
  document.getElementById('chat-screen').classList.remove('active');
}

// ========================================
// NOTIFICATIONS
// ========================================

async function loadNotifications() {
  try {
    const response = await fetch(`/api/notifications/${currentUser.id}`);
    const notifications = await response.json();

    const container = document.getElementById('notifications-list');
    const badge = document.getElementById('notif-badge');

    container.innerHTML = '';
    badge.textContent = notifications.length;
    badge.style.display = notifications.length > 0 ? 'block' : 'none';

    notifications.forEach(notif => {
      const notifEl = createNotificationItem(notif);
      container.appendChild(notifEl);
    });
  } catch (error) {
    console.error('Erreur notifications:', error);
  }
}

function createNotificationItem(notif) {
  const div = document.createElement('div');
  div.className = 'notif-item';
  div.innerHTML = `
    <div class="item-avatar">📩</div>
    <div class="item-info">
      <div class="item-message">${escapeHtml(notif.message)}</div>
      <div class="item-time">${formatDate(notif.createdAt)}</div>
    </div>
  `;
  div.onclick = async () => {
    await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
    openConversation(notif.conversationId, notif.fromUsername);
    loadNotifications();
  };
  return div;
}

// ========================================
// UTILITAIRES
// ========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Aujourd\'hui';
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR');
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const container = document.getElementById('messages-area');
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.4s ease-out;
    font-weight: 600;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.4s ease-out';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
