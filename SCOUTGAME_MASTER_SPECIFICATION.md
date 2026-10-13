# SCOUTGAME_MASTER_SPECIFICATION.md

*Dossier d'Ingénierie & d'Architecture Système — scoutgame.ch*

---

## 1. Genèse, Contexte & Décisions Fondatrices

### 1.1 Contexte et Objectifs

**Scout Game** (`scoutgame.ch`) est une suite applicative web modulaire d'animation scoute déployée à l'échelle cantonale. Le projet répond à un double besoin fonctionnel :

1. **Fournir une boîte à outils d'animation tout public (Face A)** utilisable par les chefs et les patrouilles lors des séances, réunions et camps (jeux de déduction, rôles secrets, communication).
2. **Proposer un espace festif réservé aux responsables majeurs (Face B)** pour les soirées de maîtrise, carnotzets et après-camps (jeux d'ambiance inspirés de Vullyvre/Picolo, Bottle Royale, gages et private jokes).

### 1.2 Analyse de l'Échec de la Piste Institutionnelle (MiData / Hitobito)

L'intégration de l'OAuth 2.0 officiel de MiData (moteur open-source Hitobito du Mouvement Scout de Suisse) pour filtrer les utilisateurs majeurs a été écartée pour des motifs techniques et institutionnels stricts :

* **Verrou d'administration centrale :** L'enregistrement d'une application OAuth requiert un accès administrateur sur le groupe racine (« Bundesebene / Dachverband »). Aucun responsable local, de brigade ou cantonal ne dispose de ces droits.
* **Incompatibilité institutionnelle & J+S :** Le MSdS applique des chartes Jeunesse+Sport strictes de prévention contre les addictions. Une demande officielle d'API pour un jeu d'alcool festif serait immédiatement rejetée par le Bureau Fédéral.
* **Protection des données (nLPD) :** L'accès à la date de naissance (`birthday`) impose le scope `with_roles`, qui expose l'intégralité du profil et des fonctions du membre. L'octroi de ce scope est réservé à des outils fédéraux audités.
* **Friction rédhibitoire en soirée :** Le flux OAuth impose la saisie d'identifiants, mot de passe et éventuel 2FA sur chaque téléphone en soirée de carnotzet, détruisant la convivialité du jeu.

### 1.3 Principes Directeurs du Projet

* **Le Cheval de Troie (Séparation Étanche) :** La vitrine publique du domaine ne présente que des jeux d'animation pour enfants et adolescents. La Face B est absente du code HTML public, sans aucun bouton de connexion visible.
* **Filtrage P2P sans mot de passe :** Aucun système de compte. L'accès s'amorce physiquement à l'Assemblée Générale (AG) par un QR code sur papier éphémère, puis se diffuse entre chefs de smartphone à smartphone via des QR codes éphémères de 120 secondes.
* **Respect Absolu des Camps (Blackout) :** Verrouillage systématique de la Face B pendant les périodes de camp avec diffusion d'un rappel des valeurs scoutes et de la tolérance zéro alcool auprès des jeunes.
* **Anonymat Intégral :** Les créateurs et exploitants restent invisibles. Aucune donnée nominative n'est présente dans les métadonnées Git, la base de données, les en-têtes serveurs ou le registre DNS.

---

## 2. Modèle de Sécurité, Arbre de Confiance & Modération

```text
               [ CAMPAGNE PAPIER AG ]
                         │  (Valable 24h / Révoqué après l'AG)
                         ▼
                  [ CHEF RACINE ]
                         │
             Génère QR éphémère (120 s)
                         ▼
                   [ CHEF PARRAINÉ ]
                         │
                    (Dérive constatée)
                         │
                         ▼
                    [ ADO / JEUNE ]
                         │
       ┌─────────────────┴─────────────────┐
       ▼                                   ▼
 [ Chef témoin scanne ]          [ Formulaire de signalement ]
                                 (Raison, Nom, Groupe optionnels)
                                           │
                                           ▼
                                 [ ADMIN : Validation 1 clic ]
                                           │
                                           ▼
                                [ Sciage récursif de la branche ]

```

### 2.1 Amorçage Physique (Bootstrap Token)

* Lors d'événements exclusivement réservés aux responsables adultes (Assemblée Générale cantonale, comités des chefs de groupe), des bandelettes de papier neutres sont distribuées.
* **Format du lien :** `[https://scoutgame.ch/?bootstrap=BOOTSTRAP_SECRET_XYZ](https://scoutgame.ch/?bootstrap=BOOTSTRAP_SECRET_XYZ)`
* **Texte du papier :** *« Pour les carnotzets, troisièmes mi-temps et fins de journée de maîtrise. Scannez discrètement. Faites tourner uniquement entre chefs. »*
* **Révocation programmée :** Le jeton d'amorce est configuré avec une expiration stricte (ex: 24h après le début de l'AG) ou désactivé manuellement par l'administrateur le lendemain matin.
* **Conséquence :** Si un papier est égaré ou retrouvé par un jeune ultérieurement, le lien est mort et renvoie silencieusement vers la Face A.

### 2.2 Relais de Pair à Pair (P2P Ephemeral QR Code)

* Pour transmettre l'accès à un collègue absent de l'AG, un chef déjà activé ouvre son menu secret et clique sur **« Parrainer un chef »**.
* L'application appelle l'API : `POST /api/invite/generate`.
* Le serveur génère un jeton temporaire soumis à deux règles :
* **Durée de vie :** Exactement 120 secondes.
* **Usage unique :** Détruit dès sa première consommation.


* L'écran affiche un QR code dynamique : `[https://scoutgame.ch/?invite=INVITE_TOKEN_ABC](https://scoutgame.ch/?invite=INVITE_TOKEN_ABC)`.
* Le collègue scanne l'écran avec son smartphone. Le serveur enregistre le nouveau terminal en tant qu'enfant direct (`parent_device_id`) du terminal parrain dans la base de données.
* Ce protocole rend impossible la fuite par capture d'écran sur les groupes de discussion (WhatsApp/Signal) : tout screenshot transmis expire au bout de 2 minutes.

### 2.3 Signalement Terrain & Élagage de Branche (Recursive Pruning)

Si un jeune ou une patrouille obtient l'accès de façon illégitime :

1. **Constat :** Tout chef qui repère un écran actif chez un mineur accède à la fonction de modération et scanne le QR code d'identification du téléphone incriminé.
2. **Formulaire de signalement :**
* `target_device_id` (injecté automatiquement par le scan).
* `reason` (texte obligatoire : circonstances du constat).
* `reporter_name` / `reporter_group` (champs facultatifs).


3. **Notification & Validation Admin :** Le rapport arrive dans la console d'administration sous le statut `PENDING`. L'administrateur valide la coupure en un clic.
4. **Sciage en cascade :** L'API exécute une requête CTE récursive marquant `is_revoked = TRUE` pour le nœud ciblé et l'ensemble de ses descendants directs et indirects.
5. **Effet immédiat :** Au prochain heartbeat réseau (ou lors du rechargement de la page), les sessions de tous les appareils de la branche compromise sont détruites et renvoyées vers la Face A.

### 2.4 Coupe-Circuit Périodes de Camp (Blackout)

* Pendant les plages de dates de camp définies dans la configuration système (ex: 1er juillet au 15 août pour les camps d'été), l'accès à l'ensemble de la Face B est verrouillé.
* **Message affiché :**
> *« Période des camps scouts en cours. L'espace festif est temporairement suspendu.*
> *Nos valeurs imposent une sobriété absolue auprès des jeunes. Bon camp à vos patrouilles, rendez-vous à la rentrée ! »*


* **Interrupteur d'urgence :** L'administrateur dispose d'une commande manuelle sur l'API pour déclencher ou lever un blackout instantanément en cas d'activité impromptue.

---

## 3. Architecture Technique & Hébergement

```text
               [ Internet ]
                    │
                    ▼  (Port 80 / 443 - SSL Wildcard automatique Let's Encrypt)
           ┌─────────────────┐
           │  CADDY PROXY    │
           └────────┬────────┘
                    │
      ┌─────────────┼────────────────────────────┐
      ▼             ▼                            ▼
┌───────────┐ ┌───────────┐             ┌───────────────────┐
│    HUB    │ │ CARNOTZET │  ... [JEUX] │   API BACKEND     │
│  (Static) │ │  (Static) │             │ (Python/FastAPI)  │
└───────────┘ └───────────┘             └─────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  SQLite Volume  │
                                         │  (scoutgame.db) │
                                         └─────────────────┘

```

### 3.1 Stack Technologique

* **Machine Hôte :** Instance Oracle Cloud Infrastructure (OCI) Always Free — architecture Ampere A1 Compute (ARM64, 4 OCPU, 24 Go RAM), système Ubuntu 24.04 LTS.
* **Reverse Proxy :** Caddy 2 (reverse-proxy léger, gestion native et automatisée du SSL Wildcard Let's Encrypt, suppression des en-têtes HTTP de signature).
* **Backend :** Python 3.12 avec **FastAPI** et **Uvicorn** (asynchrone, performant, typage strict, faible empreinte mémoire).
* **Base de Données :** SQLite 3 (fichier local monté dans un volume Docker persistant, sauvegardes simplifiées).
* **Frontends :** Applications statiques autonomes par sous-domaine (HTML5 / TypeScript / Tailwind CSS) packagées via Vite et servies par Nginx Alpine ou directement par Caddy.

### 3.2 Confidentialité & Nom de Domaine (`scoutgame.ch`)

* **Registrar :** Infomaniak avec enregistrement du domaine `scoutgame.ch`.
* **Protection WHOIS (Droit Suisse) :** Conformément à l'ordonnance révisée de l'OFCOM (en vigueur depuis le 1er janvier 2021), les registres publics Switch/RDDS ne diffusent plus les données personnelles des titulaires de domaines `.ch`. Infomaniak fournit de surcroît l'option *Domain Privacy* (anonymisation contractuelle par fiduciaire).
* **Hygiène DNS :** Nettoyage des enregistrements `SOA` et `TXT` pour proscrire toute mention d'email personnel, utilisation de l'alias neutre `hostmaster@scoutgame.ch`.

### 3.3 Configuration Caddy (`Caddyfile`)

```caddy
(common_headers) {
    header {
        -Server
        -X-Powered-By
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

# 1. Portail d'accueil (Hub Face A)
scoutgame.ch {
    import common_headers
    reverse_proxy hub:80
}

# 2. API Backend
api.scoutgame.ch {
    import common_headers
    reverse_proxy backend:8000
}

# 3. Jeux Face A (Jeunesse)
infiltre.scoutgame.ch {
    import common_headers
    reverse_proxy game-infiltre:80
}

rondedenuit.scoutgame.ch {
    import common_headers
    reverse_proxy game-rondedenuit:80
}

chrono.scoutgame.ch {
    import common_headers
    reverse_proxy game-chrono:80
}

# 4. Jeux Face B (Maîtrise)
carnotzet.scoutgame.ch {
    import common_headers
    reverse_proxy game-carnotzet:80
}

debout.scoutgame.ch {
    import common_headers
    reverse_proxy game-debout:80
}

debrief.scoutgame.ch {
    import common_headers
    reverse_proxy game-debrief:80
}

```

### 3.4 Orchestration Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - scout_net
    depends_on:
      - backend
      - hub

  backend:
    build: ./backend
    restart: always
    environment:
      - ADMIN_KEY=CHANGE_THIS_SECRET_KEY_FOR_ADMIN
      - SMTP_HOST=mail.infomaniak.com
      - SMTP_PORT=587
      - SMTP_USER=info@scoutgame.ch
      - SMTP_PASS=SECRET_INFOMANIAK_SMTP_PASSWORD
      - DB_PATH=/app/data/scoutgame.db
    volumes:
      - ./data:/app/data
    networks:
      - scout_net

  hub:
    build: ./hub
    restart: always
    networks:
      - scout_net

  game-infiltre:
    build: ./games/infiltre
    restart: always
    networks:
      - scout_net

  game-rondedenuit:
    build: ./games/rondedenuit
    restart: always
    networks:
      - scout_net

  game-chrono:
    build: ./games/chrono
    restart: always
    networks:
      - scout_net

  game-carnotzet:
    build: ./games/carnotzet
    restart: always
    networks:
      - scout_net

  game-debout:
    build: ./games/debout
    restart: always
    networks:
      - scout_net

  game-debrief:
    build: ./games/debrief
    restart: always
    networks:
      - scout_net

networks:
  scout_net:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:

```

---

## 4. Schéma de la Base de Données (SQLite 3 DDL)

Le fichier de données est stocké sous `./data/scoutgame.db`.

```sql
PRAGMA foreign_keys = ON;

-- 1. Campagnes d'amorçage initiales (AG, comités de responsables)
CREATE TABLE IF NOT EXISTS bootstrap_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Nœuds de l'arbre généalogique des appareils autorisés
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,                  -- UUID cryptographique généré à l'enregistrement
    parent_device_id TEXT,                -- NULL si issu directement d'un bootstrap
    bootstrap_campaign_id TEXT,           -- Identifiant de campagne si parent_device_id est NULL
    is_revoked BOOLEAN DEFAULT 0,
    revoked_at DATETIME,
    revocation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME,
    FOREIGN KEY(parent_device_id) REFERENCES devices(id),
    FOREIGN KEY(bootstrap_campaign_id) REFERENCES bootstrap_campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_devices_parent ON devices(parent_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_revoked ON devices(is_revoked);

-- 3. Jetons d'invitations éphémères (validité 120 secondes, usage unique)
CREATE TABLE IF NOT EXISTS ephemeral_invites (
    token_hash TEXT PRIMARY KEY,
    creator_device_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_consumed BOOLEAN DEFAULT 0,
    consumed_by_device_id TEXT,
    FOREIGN KEY(creator_device_id) REFERENCES devices(id),
    FOREIGN KEY(consumed_by_device_id) REFERENCES devices(id)
);

-- 4. Demandes de révocation soumises par le terrain
CREATE TABLE IF NOT EXISTS revocation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_device_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    reporter_name TEXT,
    reporter_group TEXT,
    status TEXT DEFAULT 'PENDING',        -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY(target_device_id) REFERENCES devices(id)
);

-- 5. Configuration dynamique du système (blackout camps, urgence)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Retours utilisateurs, propositions et signalements juridiques
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                   -- 'PROPOSITION' ou 'CONTACT_LEGAL'
    target_game TEXT,                     -- 'carnotzet', 'debout', 'infiltre', etc.
    category TEXT,                        -- 'duel', 'vote', 'pub', 'mots', 'bug'
    title TEXT,
    content TEXT NOT NULL,
    extra_data TEXT,                      -- Données JSON complémentaires
    author_alias TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'PENDING',        -- 'PENDING', 'INTEGRATED', 'ARCHIVED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Métriques anonymisées d'activité
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    game_id TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

```

---

## 5. Spécifications & Code Clé du Backend (Python / FastAPI)

Structure du microservice backend :

```text
backend/
├── Dockerfile
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py
    ├── config.py
    ├── database.py
    ├── models.py
    ├── services/
    │   ├── tree_service.py
    │   └── mailer.py
    └── routers/
        ├── auth.py
        ├── reports.py
        ├── feedback.py
        └── admin.py

```

### 5.1 Fichiers de Dépendances (`requirements.txt` & `Dockerfile`)

**`requirements.txt` :**

```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
aiosqlite>=0.20.0
python-dotenv>=1.0.1

```

**`Dockerfile` :**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

```

### 5.2 Algorithme Récursif de Sciage de Branche (`tree_service.py`)

Ce service assure la détection des ancêtres révoqués et la révocation récursive d'une sous-branche compromise via des requêtes Common Table Expressions (CTE).

```python
import aiosqlite
from typing import List, Tuple

async def is_device_ancestry_valid(db: aiosqlite.Connection, device_id: str) -> Tuple[bool, str]:
    """
    Remonte la chaîne des ancêtres. Si le nœud ou un ancêtre est révoqué, retourne False.
    """
    query = """
    WITH RECURSIVE Ancestors AS (
        SELECT id, parent_device_id, is_revoked, revocation_reason
        FROM devices
        WHERE id = ?
        
        UNION ALL
        
        SELECT d.id, d.parent_device_id, d.is_revoked, d.revocation_reason
        FROM devices d
        INNER JOIN Ancestors a ON d.id = a.parent_device_id
    )
    SELECT id, revocation_reason FROM Ancestors WHERE is_revoked = 1 LIMIT 1;
    """
    async with db.execute(query, (device_id,)) as cursor:
        row = await cursor.fetchone()
        if row:
            return False, f"Accès révoqué suite à la coupure de la branche (nœud: {row[0]})"
    return True, ""

async def prune_branch_recursive(db: aiosqlite.Connection, target_device_id: str, reason: str) -> int:
    """
    Révoque un appareil et l'ensemble de ses descendants directs et indirects.
    """
    select_descendants_query = """
    WITH RECURSIVE Descendants AS (
        SELECT id FROM devices WHERE id = ?
        UNION ALL
        SELECT d.id FROM devices d
        INNER JOIN Descendants desc ON d.parent_device_id = desc.id
    )
    SELECT id FROM Descendants;
    """
    async with db.execute(select_descendants_query, (target_device_id,)) as cursor:
        rows = await cursor.fetchall()
        device_ids_to_revoke = [r[0] for r in rows]

    if not device_ids_to_revoke:
        return 0

    placeholders = ",".join("?" for _ in device_ids_to_revoke)
    update_query = f"""
    UPDATE devices 
    SET is_revoked = 1, 
        revoked_at = CURRENT_TIMESTAMP, 
        revocation_reason = ?
    WHERE id IN ({placeholders})
    """
    await db.execute(update_query, [reason] + device_ids_to_revoke)
    await db.commit()
    return len(device_ids_to_revoke)

```

### 5.3 Routeur d'Authentification & P2P (`routers/auth.py`)

```python
import hashlib
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
import aiosqlite
from app.database import get_db
from app.services.tree_service import is_device_ancestry_valid

router = APIRouter(prefix="/api", tags=["auth"])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

@router.post("/auth/bootstrap")
async def exchange_bootstrap_token(payload: dict, db: aiosqlite.Connection = Depends(get_db)):
    token = payload.get("bootstrap_token")
    if not token:
        raise HTTPException(status_code=400, detail="Token manquant")
    
    token_h = hash_token(token)
    query = """
    SELECT id, is_active, expires_at FROM bootstrap_campaigns
    WHERE token_hash = ? AND is_active = 1
    """
    async with db.execute(query, (token_h,)) as cursor:
        campaign = await cursor.fetchone()
        
    if not campaign:
        raise HTTPException(status_code=403, detail="Jeton d'amorce invalide ou expiré")
    
    camp_id, _, expires_at = campaign
    if expires_at and datetime.datetime.fromisoformat(expires_at) < datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Jeton d'amorce expiré")

    new_device_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO devices (id, bootstrap_campaign_id) VALUES (?, ?)",
        (new_device_id, camp_id)
    )
    await db.commit()
    return {"device_pass": new_device_id, "status": "authorized"}

@router.post("/invite/generate")
async def generate_ephemeral_invite(
    authorization: str = Header(...),
    db: aiosqlite.Connection = Depends(get_db)
):
    device_id = authorization.replace("Bearer ", "").strip()
    valid, reason = await is_device_ancestry_valid(db, device_id)
    if not valid:
        raise HTTPException(status_code=403, detail=reason)

    raw_invite_token = f"inv_{uuid.uuid4().hex}"
    invite_hash = hash_token(raw_invite_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=120)

    await db.execute(
        """INSERT INTO ephemeral_invites (token_hash, creator_device_id, expires_at)
           VALUES (?, ?, ?)""",
        (invite_hash, device_id, expires_at.isoformat())
    )
    await db.commit()
    return {"invite_token": raw_invite_token, "expires_in": 120}

@router.post("/invite/consume")
async def consume_ephemeral_invite(payload: dict, db: aiosqlite.Connection = Depends(get_db)):
    raw_token = payload.get("invite_token")
    if not raw_token:
        raise HTTPException(status_code=400, detail="Token manquant")

    token_h = hash_token(raw_token)
    now = datetime.datetime.utcnow().isoformat()

    query = """
    SELECT creator_device_id, is_consumed, expires_at FROM ephemeral_invites
    WHERE token_hash = ?
    """
    async with db.execute(query, (token_h,)) as cursor:
        invite = await cursor.fetchone()

    if not invite or invite[1] == 1 or invite[2] < now:
        raise HTTPException(status_code=400, detail="Invitation invalide ou expirée (>120s)")

    creator_id = invite[0]
    # Vérification que le parrain est toujours légitime
    parent_valid, reason = await is_device_ancestry_valid(db, creator_id)
    if not parent_valid:
        raise HTTPException(status_code=403, detail="Le terminal parrain a été révoqué")

    new_device_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO devices (id, parent_device_id) VALUES (?, ?)",
        (new_device_id, creator_id)
    )
    await db.execute(
        "UPDATE ephemeral_invites SET is_consumed = 1, consumed_by_device_id = ? WHERE token_hash = ?",
        (new_device_id, token_h)
    )
    await db.commit()
    return {"device_pass": new_device_id, "status": "authorized"}

@router.post("/auth/verify")
async def verify_device(payload: dict, db: aiosqlite.Connection = Depends(get_db)):
    device_id = payload.get("device_pass")
    if not device_id:
        return {"valid": False, "reason": "Jeton manquant"}

    valid, reason = await is_device_ancestry_valid(db, device_id)
    if not valid:
        return {"valid": False, "reason": reason}

    # Mise à jour de la dernière activité
    await db.execute("UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", (device_id,))
    await db.commit()
    return {"valid": True}

```

### 5.4 Relais Email SMTP (`services/mailer.py`)

Ce module assure l'expédition asynchrone des formulaires de proposition (`proposition@scoutgame.ch`) et de signalement légal (`info@scoutgame.ch`) via la plateforme d'Infomaniak.

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "mail.infomaniak.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "info@scoutgame.ch")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def send_relay_email(to_email: str, subject: str, content: str, reply_to: str = None) -> bool:
    try:
        msg = MIMEMultipart()
        msg["From"] = f"Scout Game Bot <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to

        msg.attach(MIMEText(content, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[MAIL ERROR] Échec d'envoi du message : {e}")
        return False

```

---

## 6. Catalogue Universel de Cartes : Format `content.csv` & Import

Le fichier maître `content.csv` est placé dans le dossier `./data/`. Il sert de source unique pour les cartes de tous les jeux.

### 6.1 Format & Exemples (`content.csv`)

```csv
game,category,title,content,extra,sips,min_players
carnotzet,duel,Bras de Fer,{p1} et {p2} s'affrontent au bras de fer. Le perdant boit {sips} gorgées.,,3,2
carnotzet,vote,Tente oubliée,Votez à main levée : qui est le plus susceptible d'oublier les sardines de tente ? Le désigné boit {sips}.,,2,3
carnotzet,pub,Alerte Sanitaire,Un éclaireur a perdu une jambe en raid. Que faites-vous ?,A: Cellule de crise | B: Arnica,4,1
carnotzet,regle,Règle Intendance,Interdiction de pointer du doigt sous peine de boire {sips} gorgées.,durée:3 tours,1,3
debout,reflexe,Flamme Bleue,Touchez l'écran dès que la flamme devient bleue. Le plus lent est éliminé.,,0,2
debout,chrono,Sens du Temps,Estimez 10 secondes les yeux fermés. Le pire écart boit {sips} et sort.,duree:10s,2,2
debout,duel,Nœud de Chaise,{p1} et {p2} réalisent un nœud de chaise dans le dos. Le dernier fini est éliminé.,,0,2
infiltre,mots,Pionnier,Brêlage,Froissartage,0,3
infiltre,mots,Cuisine de Camp,Gamelle,Bidon,0,3
infiltre,mots,Topographie,Boussole,Altimètre,0,3
debrief,verite,Vérité Intendance,Quel est le pire plat que tu as servi en camp sans assumer l'échec ?,Avoue ou prends {sips} gorgées,2,2
debrief,jamais,Je n'ai jamais,Je n'ai jamais dormi pendant mon propre tour de veille de nuit.,Tous les concernés boivent {sips},2,2

```

### 6.2 Script d'Import Automatisé (`import_content.py`)

Ce script parse le CSV et charge son contenu dans la base SQLite (ou génère les fichiers statiques de distribution).

```python
import csv
import aiosqlite
import asyncio

async def import_csv_to_db(csv_path: str, db_path: str):
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            extra TEXT,
            sips INTEGER DEFAULT 0,
            min_players INTEGER DEFAULT 2
        )
        """)
        await db.execute("DELETE FROM cards")  # Remplacement intégral

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            records = [
                (
                    row["game"],
                    row["category"],
                    row.get("title") or "",
                    row["content"],
                    row.get("extra") or "",
                    int(row.get("sips") or 0),
                    int(row.get("min_players") or 2)
                )
                for row in reader
            ]

        await db.executemany(
            """INSERT INTO cards (game, category, title, content, extra, sips, min_players)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            records
        )
        await db.commit()
        print(f"[IMPORT] {len(records)} cartes importées avec succès dans la base.")

if __name__ == "__main__":
    asyncio.run(import_csv_to_db("./data/content.csv", "./data/scoutgame.db"))

```

---

## 7. Spécifications Frontend & Ergonomie Mobile

### 7.1 Bonnes Pratiques Mobile-First

* **Contrainte de hauteur d'écran :**
```css
.app-container {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    touch-action: manipulation;
}

```


* **Suppression des latences tactiles et des zooms involontaires :**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

```



### 7.2 Synchronisation des Joueurs Inter-Jeux

Pour éviter de ressaisir les prénoms à chaque bascule de jeu, le frontend stocke et lit la liste des participants dans un cookie de domaine partagé :

```javascript
// Enregistrement de la liste des joueurs
function saveActivePlayers(playersArray) {
    const encoded = encodeURIComponent(JSON.stringify(playersArray));
    document.cookie = `scout_players=${encoded}; Domain=.scoutgame.ch; Path=/; Max-Age=86400; SameSite=Lax; Secure`;
}

// Récupération automatique au montage d'un sous-domaine
function loadActivePlayers() {
    const match = document.cookie.match(new RegExp('(^| )scout_players=([^;]+)'));
    if (match) {
        try {
            return JSON.parse(decodeURIComponent(match[2]));
        } catch (e) {
            return [];
        }
    }
    return [];
}

```

### 7.3 Interception Silencieuse du Déblocage (`Hub/App.tsx`)

Au chargement de `scoutgame.ch`, un script vérifie la présence des paramètres `?bootstrap=` ou `?invite=`, procède à l'échange d'autorisation en tâche de fond, sauvegarde le pass dans le `localStorage` et nettoie l'URL sans rechargement de page.

```typescript
useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bootstrapToken = params.get("bootstrap");
    const inviteToken = params.get("invite");

    if (bootstrapToken) {
        fetch("https://api.scoutgame.ch/api/auth/bootstrap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bootstrap_token: bootstrapToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.device_pass) {
                localStorage.setItem("scout_device_pass", data.device_pass);
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsAuthorized(true);
            }
        });
    } else if (inviteToken) {
        fetch("https://api.scoutgame.ch/api/invite/consume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invite_token: inviteToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.device_pass) {
                localStorage.setItem("scout_device_pass", data.device_pass);
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsAuthorized(true);
            }
        });
    }
}, []);

```

### 7.4 Easter Egg d'Accès Responsable

L'accès à la Face B ne se fait via aucun bouton visible. Sur le Hub public :

* Un **appui long de 3 secondes** sur le logo principal (ou un triple-tap discret sur la mention de copyright du footer) déclenche une légère vibration haptique (`navigator.vibrate(50)`).
* Si le terminal possède un `scout_device_pass` valide en local, le volet coulissant de la Face B se déploie.
* Si le terminal n'est pas encore autorisé, l'application ouvre simplement un scanner photo plein écran invitant à scanner le QR code d'un chef parrain.

---

## 8. Procédures Opérationnelles & Guide de Déploiement

### 8.1 Configuration Initiale de l'Instance OCI

1. **Création de la VM :** Sélectionner l'image Ubuntu 24.04 LTS sous l'offre Always Free Ampere A1 (ARM64).
2. **Ouverture des Ports Réseau (OCI Virtual Cloud Network) :**
* Dans la console OCI : *Networking -> Virtual Cloud Networks -> VCN -> Security Lists -> Ingress Rules*.
* Ajouter les règles :
* Port 80 (HTTP) : CIDR source `0.0.0.0/0`, Protocole TCP.
* Port 443 (HTTPS) : CIDR source `0.0.0.0/0`, Protocole TCP.




3. **Pare-feu Local Ubuntu (`iptables` / `ufw`) :**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

```



### 8.2 Procédure Lors de l'Assemblée Générale (AG)

1. **Génération du token d'amorce :**
Insérer la campagne dans la base SQLite avant l'événement :
```sql
INSERT INTO bootstrap_campaigns (id, name, token_hash, expires_at) 
VALUES (
    'ag-automne-2026', 
    'AG Cantonale 2026', 
    'HASH_SHA256_DE_LA_CLE_SECRETE', 
    '2026-10-18 04:00:00'
);

```


2. **Impression des QR codes :** Imprimer les bandelettes avec l'URL encodée :
`[https://scoutgame.ch/?bootstrap=CLE_SECRETE](https://scoutgame.ch/?bootstrap=CLE_SECRETE)`
3. **Clôture de la campagne :** Le lendemain matin à 08h00, couper le jeton :
```sql
UPDATE bootstrap_campaigns SET is_active = 0 WHERE id = 'ag-automne-2026';

```



### 8.3 Procédure d'Intervention en Cas de Fuite Mineure

1. Le responsable sur le terrain scanne l'appareil du jeune via l'interface de signalement du Hub.
2. L'administrateur reçoit la notification, se connecte sur `[https://api.scoutgame.ch/docs](https://api.scoutgame.ch/docs)` (ou exécute un appel curl) :
```bash
curl -X POST https://api.scoutgame.ch/api/admin/prune-branch \
  -H "X-Admin-Key: CHANGE_THIS_SECRET_KEY_FOR_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"target_device_id": "UUID_DU_DEVICE_CIBLE", "reason": "Compromission mineurs troupe 2"}'

```


3. L'arbre entier issu de cet appareil est désactivé sur-le-champ.

### 8.4 Activation du Blackout de Camp d'Été

Pour verrouiller l'espace festif sans toucher au code :

```sql
INSERT INTO system_config (key, value) 
VALUES ('camp_blackout_active', 'true')
ON CONFLICT(key) DO UPDATE SET value = 'true';

```

Pour rétablir l'accès lors des débriefings d'automne :

```sql
UPDATE system_config SET value = 'false' WHERE key = 'camp_blackout_active';

```