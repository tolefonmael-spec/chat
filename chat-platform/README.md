# 💬 Chat Platform

Plateforme de chat en temps réel moderne, sécurisée et facile à utiliser.

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** - Mots de passe hashés
- 🔍 **Recherche d'utilisateurs** - Trouvez et invitez n'importe qui
- 💬 **Chat en temps réel** - Messages instantanés
- 🔔 **Notifications** - Alertes pour les invitations
- 📱 **Interface moderne** - Design élégant et responsive
- 💾 **Persistance** - Toutes les données sauvegardées

## 🚀 Démarrage ULTRA-RAPIDE

### Windows

**Double-cliquez sur `start.bat`** - C'est tout ! ✨

Le script fait automatiquement :
- ✅ Vérifie Node.js
- ✅ Installe les dépendances
- ✅ Libère le port 3000
- ✅ Démarre le serveur
- ✅ Ouvre votre navigateur

### Manuellement

```bash
# 1. Installer les dépendances (première fois uniquement)
npm install

# 2. Démarrer
npm start

# 3. Ouvrir
http://localhost:3000
```

## 📖 Guide d'utilisation

### 1️⃣ Créer un compte

- Cliquez sur "Inscription"
- Choisissez un nom d'utilisateur (3-30 caractères)
- Créez un mot de passe (min 6 caractères)
- Cliquez sur "S'inscrire"

### 2️⃣ Se connecter

- Entrez vos identifiants
- Cliquez sur "Se connecter"

### 3️⃣ Inviter quelqu'un

- Tapez un nom dans la barre de recherche
- Cliquez sur "Inviter" à côté du nom
- L'autre personne reçoit une notification

### 4️⃣ Chatter

- Cliquez sur une conversation
- Tapez votre message
- Appuyez sur Entrée ou cliquez "Envoyer"

## 🛠️ Technologies

- **Backend** : Node.js + Express
- **Temps réel** : Socket.io
- **Stockage** : Fichiers JSON (pas de base de données complexe !)
- **Sécurité** : bcryptjs + rate limiting
- **Frontend** : HTML + CSS + JavaScript vanilla

## 📂 Structure

```
chat-platform/
├── server.js          # Serveur principal
├── package.json       # Dépendances
├── start.bat          # Script de démarrage Windows
├── data/              # Données (créé automatiquement)
│   ├── users.json
│   ├── conversations.json
│   ├── messages.json
│   └── notifications.json
└── public/            # Interface
    ├── index.html
    ├── styles.css
    └── app.js
```

## 🔒 Sécurité

- ✅ Mots de passe hashés avec bcrypt
- ✅ Rate limiting (protection spam)
- ✅ Validation des entrées
- ✅ Échappement HTML (protection XSS)
- ✅ Messages limités à 5000 caractères

## ❓ Problèmes fréquents

### Le serveur ne démarre pas

**Erreur "EADDRINUSE" ?**
→ Le port 3000 est déjà utilisé
→ **Solution** : Utilisez `start.bat` qui libère automatiquement le port

ou

```powershell
# Trouver le processus
netstat -ano | findstr :3000

# Tuer le processus (remplacez 12345 par le PID trouvé)
taskkill /PID 12345 /F

# Redémarrer
npm start
```

### Impossible de se connecter

1. Vérifiez que le serveur est démarré
2. Allez sur `http://localhost:3000` (pas 3001 ou autre)
3. Créez d'abord un compte avec "Inscription"

### Les messages ne s'affichent pas

1. Rechargez la page (F5)
2. Vérifiez la console (F12) pour des erreurs
3. Assurez-vous d'avoir une connexion internet

## 🎨 Personnalisation

### Changer le port

Dans `server.js`, ligne 14 :
```javascript
const PORT = process.env.PORT || 3001; // Changez 3000 en 3001
```

### Modifier les couleurs

Dans `public/styles.css`, lignes 3-15 :
```css
:root {
  --primary: #6366f1;     /* Couleur principale */
  --secondary: #ec4899;    /* Couleur secondaire */
  /* ... */
}
```

## 🌐 Mise en production

Pour mettre votre chat en ligne :

1. **Heroku** (gratuit pour débuter)
2. **Railway.app** (5$ gratuit)
3. **Render.com** (gratuit)
4. **VPS** (DigitalOcean, Linode)

> ⚠️ Pour la production, pensez à utiliser une vraie base de données (PostgreSQL, MongoDB)

## 📊 Performances

- ⚡ Très léger (pas de base de données lourde)
- 🚀 Temps réel avec Socket.io
- 💨 Interface ultra-rapide
- 📦 Fichiers JSON = facile à sauvegarder

## 🤝 Support

En cas de problème :

1. Vérifiez que Node.js est installé : `node --version`
2. Réinstallez les dépendances : `npm install`
3. Consultez les logs du serveur dans le terminal
4. Vérifiez la console du navigateur (F12)

## 📄 Licence

Libre d'utilisation pour projets personnels et commerciaux.

---

**Créé avec ❤️ pour une communication simple et sécurisée**

🌟 Si vous aimez ce projet, partagez-le !
