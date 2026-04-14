const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initialiser les fichiers de données
function initDataFiles() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(CONVERSATIONS_FILE)) {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([]));
  }
}

initDataFiles();

// Fonctions helper pour lire/écrire les données
function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez plus tard' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion' }
});

app.use('/api/', limiter);

// Stockage des utilisateurs connectés
const connectedUsers = new Map();

// ========================================
// ROUTES API
// ========================================

// Inscription
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire entre 3 et 30 caractères' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const users = readData(USERS_FILE);

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    console.log(`✅ Nouvel utilisateur: ${username}`);
    res.json({ id: newUser.id, username: newUser.username });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants requis' });
    }

    const users = readData(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    console.log(`✅ Connexion: ${username}`);
    res.json({ id: user.id, username: user.username });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des utilisateurs
app.get('/api/users/search/:userId/:query', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const query = req.params.query.toLowerCase().trim();

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const users = readData(USERS_FILE);
    const results = users
      .filter(u => u.id !== userId && u.username.toLowerCase().includes(query))
      .slice(0, 20)
      .map(u => ({ id: u.id, username: u.username }));

    res.json(results);
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les conversations d'un utilisateur
app.get('/api/conversations/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const conversations = readData(CONVERSATIONS_FILE);
    const users = readData(USERS_FILE);

    const userConversations = conversations
      .filter(c => c.participants.includes(userId))
      .map(c => {
        const otherUserIds = c.participants.filter(id => id !== userId);
        const otherUsers = users.filter(u => otherUserIds.includes(u.id));
        const participantNames = otherUsers.map(u => u.username).join(', ');

        return {
          id: c.id,
          participants: participantNames,
          createdAt: c.createdAt
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userConversations);
  } catch (error) {
    console.error('Erreur conversations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une conversation
app.post('/api/conversations', (req, res) => {
  try {
    const { userId, targetUserId } = req.body;

    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const conversations = readData(CONVERSATIONS_FILE);
    const users = readData(USERS_FILE);

    // Vérifier si la conversation existe déjà
    const existing = conversations.find(c =>
      c.participants.length === 2 &&
      c.participants.includes(userId) &&
      c.participants.includes(targetUserId)
    );

    if (existing) {
      return res.json({ id: existing.id, existing: true });
    }

    // Créer nouvelle conversation
    const newConversation = {
      id: conversations.length + 1,
      participants: [userId, targetUserId],
      createdAt: new Date().toISOString()
    };

    conversations.push(newConversation);
    writeData(CONVERSATIONS_FILE, conversations);

    // Créer notification
    const fromUser = users.find(u => u.id === userId);
    const notifications = readData(NOTIFICATIONS_FILE);

    const newNotification = {
      id: notifications.length + 1,
      fromUserId: userId,
      toUserId: targetUserId,
      conversationId: newConversation.id,
      message: `${fromUser.username} vous a envoyé une invitation`,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(newNotification);
    writeData(NOTIFICATIONS_FILE, notifications);

    // Envoyer notification en temps réel
    const targetSocketId = connectedUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('notification', {
        from: fromUser.username,
        conversationId: newConversation.id,
        message: newNotification.message
      });
    }

    console.log(`✅ Conversation créée: ${userId} <-> ${targetUserId}`);
    res.json({ id: newConversation.id, existing: false });
  } catch (error) {
    console.error('Erreur création conversation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les messages d'une conversation
app.get('/api/messages/:conversationId', (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const messages = readData(MESSAGES_FILE);
    const users = readData(USERS_FILE);

    const conversationMessages = messages
      .filter(m => m.conversationId === conversationId)
      .map(m => {
        const user = users.find(u => u.id === m.userId);
        return {
          ...m,
          username: user ? user.username : 'Inconnu'
        };
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(conversationMessages);
  } catch (error) {
    console.error('Erreur messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les notifications
app.get('/api/notifications/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = readData(NOTIFICATIONS_FILE);
    const users = readData(USERS_FILE);

    const userNotifications = notifications
      .filter(n => n.toUserId === userId && !n.isRead)
      .map(n => {
        const fromUser = users.find(u => u.id === n.fromUserId);
        return {
          ...n,
          fromUsername: fromUser ? fromUser.username : 'Inconnu'
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userNotifications);
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
app.post('/api/notifications/:notificationId/read', (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const notifications = readData(NOTIFICATIONS_FILE);

    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      writeData(NOTIFICATIONS_FILE, notifications);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lecture notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// SOCKET.IO
// ========================================

io.on('connection', (socket) => {
  console.log('🔌 Nouvelle connexion');

  socket.on('register', (userId) => {
    connectedUsers.set(parseInt(userId), socket.id);
    console.log(`👤 Utilisateur ${userId} connecté`);
  });

  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
  });

  socket.on('send-message', (data) => {
    const { conversationId, userId, message } = data;

    if (!message || message.trim().length === 0 || message.length > 5000) {
      return;
    }

    const messages = readData(MESSAGES_FILE);
    const users = readData(USERS_FILE);

    const newMessage = {
      id: messages.length + 1,
      conversationId,
      userId,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    messages.push(newMessage);
    writeData(MESSAGES_FILE, messages);

    const user = users.find(u => u.id === userId);

    io.to(`conversation-${conversationId}`).emit('new-message', {
      ...newMessage,
      username: user ? user.username : 'Inconnu'
    });
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👋 Utilisateur ${userId} déconnecté`);
        break;
      }
    }
  });
});

// ========================================
// ROUTES
// ========================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========================================
// DÉMARRAGE
// ========================================

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 SERVEUR DE CHAT DÉMARRÉ !        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`  📍 URL locale:     http://localhost:${PORT}`);
  console.log(`  📍 Réseau local:   http://YOUR_IP:${PORT}`);
  console.log('');
  console.log('  💡 Pour arrêter: Ctrl + C');
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  process.exit(0);
});
