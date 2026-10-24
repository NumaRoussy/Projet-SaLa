# Scout Game — Portail Hub (`scoutgame.ch`)

Portail d'accueil et vitrine publique officielle de l'écosystème **Scout Game** (Phase 2).
Développé avec **Vite**, **React 18**, **TypeScript** et **Tailwind CSS**, conçu en approche **Mobile-First**.

---

## 🌟 Architecture & Fonctionnalités

### 1. Face A — La Vitrine Publique (« Le Cheval de Troie »)
* **Design Scout & Nature** : Palette de couleurs forestières scoutes (`#1a3a2a`, `#2d6a4f`, `#40916c`, `#52b788`, `#74c69d`), typographies *Outfit* et *Inter*, effets de verre *glassmorphism*.
* **Catalogue des Jeux Jeunesse** :
  * 🕵️ **L'Infiltré** (`infiltre.scoutgame.ch`)
  * ⛺ **Couvre-feu** (`couvrefeu.scoutgame.ch`)
  * ⏱️ **Chrono** (`chrono.scoutgame.ch`)
* **Gestion des Joueurs Inter-Jeux (Section 7.2)** :
  * Ajout et suppression des prénoms des joueurs actifs.
  * Stockage persistant dans le cookie `scout_players`.
  * Cookie partagé sur le domaine `.scoutgame.ch` en production et fallback local sans restriction de domaine pour le développement.
* **Formulaire de Retour Utilisateur** :
  * Proposer une idée de carte (`PROPOSITION` vers `proposition@scoutgame.ch`).
  * Contact institutionnel ou signalement légal (`CONTACT_LEGAL` vers `info@scoutgame.ch`).
* **Zéro indice visible** : Aucun bouton ou lien de connexion vers l'espace maîtrise n'apparaît dans l'interface publique.

### 2. Mécanisme Secret & Easter Egg (Section 7.4)
* **Déclenchement** :
  * **Appui long de 3 secondes** sur le logo principal (fleur de lys scoute).
  * Ou **triple-tap discret** sur le copyright du footer.
  * Déclenchement d'un retour haptique (`navigator.vibrate(50)`).
* **Vérification automatique** (`POST /api/auth/verify`) :
  * Si l'appareil possède un `scout_device_pass` valide en `localStorage`, déploiement du volet secret Face B.
  * Si le mode **Camp Blackout** est actif (`camp_blackout_active`), affichage de l'écran officiel de sobriété scoute (Section 2.4).
  * Si l'appareil n'est pas encore autorisé, ouverture du scanner / modal invitant à scanner le QR code d'un chef parrain.

### 3. Face B — Espace Maîtrise
* **Jeux de Maîtrise** :
  * 🍺 **Carnotzet** (`carnotzet.scoutgame.ch`)
  * ⚡ **Debout** (`debout.scoutgame.ch`)
  * 🔥 **Débrief** (`debrief.scoutgame.ch`)
* **Parrainage P2P de Chef (Section 2.2)** :
  * Génération d'un QR code d'invitation éphémère de **120 secondes** via `POST /api/invite/generate`.
  * Compte à rebours animé en temps réel avec barre de progression.
  * Partage sous forme d'URL ou scan direct via caméra.
* **Mon Appareil (Section 7.4)** :
  * Affichage du QR code d'identification de l'appareil (encodant le `device_pass`), scannable lors d'un contrôle ou signalement.
* **Signalement de Terrain (Section 2.3)** :
  * Formulaire de signalement d'un appareil compromis vers `POST /api/reports`.

### 4. Interception Silencieuse d'URL (Section 7.3)
* Détection automatique des paramètres d'URL :
  * `?bootstrap=<TOKEN>` : Échange contre un pass racine via `POST /api/auth/bootstrap`.
  * `?invite=<TOKEN>` : Consommation de l'invitation P2P via `POST /api/invite/consume`.
* Sauvegarde du pass dans `localStorage` sous `scout_device_pass` et nettoyage immédiat de l'URL via `window.history.replaceState` sans rechargement.

---

## 📱 Ergonomie Mobile-First (Section 7.1)

* Viewport configuré pour supprimer les latences tactiles et zooms involontaires :
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  ```
* Conteneur d'application respectant les zones sécurisées (encoches / safe area) :
  ```css
  .app-container {
    min-height: 100dvh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    touch-action: manipulation;
  }
  ```

---

## 🛠️ Configuration & Variables d'Environnement

* `.env.development` :
  ```bash
  VITE_API_URL=http://localhost:8000
  ```
* `.env.production` :
  ```bash
  VITE_API_URL=https://api.scoutgame.ch
  ```

---

## 🚀 Commandes Disponibles

Dans le dossier `hub/` :

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement local (port 3000 avec proxy /api)
npm run dev

# Vérification des types TypeScript et compilation de production
npm run build

# Analyse statique du code (ESLint)
npm run lint

# Prévisualisation du build de production localement
npm run preview
```

---

## 🐳 Conteneurisation Docker (Nginx Alpine)

Le Dockerfile utilise une approche multi-stage optimisée :

1. **Stage 1 (builder)** : Node 22 Alpine compile l'application TypeScript/Vite vers `/app/dist`.
2. **Stage 2 (runner)** : Nginx Alpine sert les fichiers statiques sur le port 80 avec compression gzip, fallback SPA (`try_files $uri /index.html`) et mise en cache des assets immutables.

```bash
# Construction de l'image Docker
docker build -t scoutgame-hub .

# Lancement du conteneur
docker run -d -p 80:80 scoutgame-hub
```
