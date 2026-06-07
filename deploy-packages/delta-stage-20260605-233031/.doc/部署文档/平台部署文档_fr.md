# Documentation de déploiement de la plateforme yFeiEye

## 📋 Table des matières

- #aperçu
- #exigences-de-lenvironnement
- #démarrage-rapide
- #instructions-dutilisation-des-scripts
- #description-des-modules
- #ports-des-services
- #questions-fréquentes
- #gestion-des-journaux

## Aperçu

yFeiEye est une plateforme d'application d'algorithmes intelligents intégrant cloud et périphérie, utilisant un script d'installation unifié pour un déploiement en un clic. Cette plateforme prend en charge le déploiement par conteneurisation Docker, permettant l'installation et le démarrage rapides de tous les modules de service.

### Architecture de la plateforme

La plateforme yFeiEye est composée des modules principaux suivants :

- **Services de base** (`.scripts/docker`) : Contient les middleware tels que Nacos, PostgreSQL, Redis, TDEngine, Kafka, MinIO, etc.
- **Service DEVICE** : Service de gestion des appareils et de passerelle (basé sur Java)
- **Service IA** : Service de traitement d'intelligence artificielle (basé sur Python)
- **Service VIDÉO** : Service de traitement vidéo (basé sur Python)
- **Service WEB** : Service frontal Web (basé sur Vue)

## Exigences de l'environnement

### Exigences système

- **Système d'exploitation** :
   - Linux (Ubuntu 24.04 recommandé)
   - macOS (macOS 10.15+ recommandé)
   - Windows (Windows 10/11 recommandés, nécessite PowerShell 5.1+)
- **Mémoire** : 32 Go recommandés (minimum 16 Go)
- **Espace disque** : 200 Go d'espace libre ou plus recommandés
- **CPU** : 8 cœurs recommandés (minimum 4 cœurs)
- **Carte graphique** : NVIDIA GPU recommandé (minimum CPU)

### Dépendances logicielles

Avant d'exécuter le script de déploiement, assurez-vous que les logiciels suivants sont installés :

1. **Docker** (version obligatoire v29.0.0+)
   - Guide d'installation : https://docs.docker.com/get-docker/
   - Vérification de l'installation : `docker --version`
   - **Remarque** : La version de Docker doit être v29.0.0 ou supérieure. Les versions inférieures ne fonctionneront pas correctement.

2. **Docker Compose** (version obligatoire v2.35.0+)
   - Guide d'installation : https://docs.docker.com/compose/install/
   - Vérification de l'installation : `docker compose version`
   - **Remarque** : La version de Docker Compose doit être v2.35.0 ou supérieure. Les versions inférieures ne fonctionneront pas correctement.

3. **Autres dépendances**:
   - **Linux/macOS** : `curl` (utilisé pour les vérifications de santé, généralement préinstallé)
   - **Windows** : PowerShell 5.1+ (généralement préinstallé)

### Configuration des permissions Docker

#### Linux

Assurez-vous que l'utilisateur actuel a l'autorisation d'accéder au démon Docker :

```bash
# Méthode 1 : Ajouter l'utilisateur au groupe docker (recommandé)
sudo usermod -aG docker $USER
# Puis reconnectez-vous ou exécutez
newgrp docker

# Méthode 2 : Exécuter le script avec sudo (non recommandé)
sudo ./install_linux.sh [commande]
```

Vérifiez les permissions Docker :

```bash
docker ps
```

#### macOS

macOS ne nécessite généralement pas de configuration de permissions spécifique. Docker Desktop gère les permissions automatiquement.

#### Windows

Sous Windows, Docker Desktop gère les permissions automatiquement. Assurez-vous de lancer PowerShell en tant qu'administrateur si nécessaire.

## Démarrage rapide

### Déploiement Linux

#### 1. Obtenir le code du projet

```bash
# Cloner le projet (si ce n'est pas déjà fait)
git clone <url-du-dépôt>
cd yfeieye
```

#### 2. Accéder au répertoire des scripts

```bash
cd .scripts/docker
```

#### 3. Donner les permissions d'exécution au script

```bash
chmod +x install_linux.sh
```

#### 4. Installer tous les services en un clic

```bash
./install_linux.sh install
```

Cette commande va :
- Vérifier l'environnement Docker et Docker Compose
- Créer le réseau unifié `yfeieye-network`
- Installer tous les modules dans l'ordre des dépendances
- Démarrer tous les conteneurs de services

#### 5. Vérifier le statut des services

```bash
./install_linux.sh verify
```

Si tous les services fonctionnent normalement, les adresses d'accès aux services seront affichées.

### Déploiement macOS

#### 1. Obtenir le code du projet

```bash
# Cloner le projet (si ce n'est pas déjà fait)
git clone <url-du-dépôt>
cd yfeieye
```

#### 2. Accéder au répertoire des scripts

```bash
cd .scripts/docker
```

#### 3. Donner les permissions d'exécution au script

```bash
chmod +x install_mac.sh
```

#### 4. Installer tous les services en un clic

```bash
./install_mac.sh install
```

Cette commande va :
- Vérifier l'environnement Docker et Docker Compose
- Créer le réseau unifié `yfeieye-network`
- Installer tous les modules dans l'ordre des dépendances
- Démarrer tous les conteneurs de services

#### 5. Vérifier le statut des services

```bash
./install_mac.sh verify
```

Si tous les services fonctionnent normalement, les adresses d'accès aux services seront affichées.

### Déploiement Windows

Pour des instructions détaillées sur le déploiement Windows, y compris la préparation de l'environnement, le déploiement des middleware, le démarrage des services et le dépannage, veuillez consulter le [Guide de déploiement Windows](平台Windows部署文档_fr.md) dédié.

Le guide de déploiement Windows fournit des instructions étape par étape complètes, couvrant :
- Exigences système et configuration de l'environnement
- Installation et configuration des middleware
- Procédures de démarrage des services
- Configuration de la diffusion vidéo en continu
- Problèmes courants et solutions
- Référence des commandes

Ce guide est spécialement conçu pour les systèmes Windows 10/11 et couvre les scénarios de déploiement local.

## Instructions d'utilisation des scripts

### Emplacement des scripts

Les scripts d'installation unifiés sont situés dans le répertoire `.scripts/docker/` à la racine du projet :

- **Linux** : `install_linux.sh`
- **macOS** : `install_mac.sh`
- **Windows** : `install_win.ps1`

### Commandes disponibles

Tous les systèmes d'exploitation prennent en charge les mêmes commandes, mais les noms des scripts diffèrent :

| Commande | Description | Exemple Linux | Exemple macOS | Exemple Windows |
|----------|-------------|---------------|---------------|----------------|
| `install` | Installer et démarrer tous les services (première exécution) | `./install_linux.sh install` | `./install_mac.sh install` | `.\install_win.ps1 install` |
| `start` | Démarrer tous les services | `./install_linux.sh start` | `./install_mac.sh start` | `.\install_win.ps1 start` |
| `stop` | Arrêter tous les services | `./install_linux.sh stop` | `./install_mac.sh stop` | `.\install_win.ps1 stop` |
| `restart` | Redémarrer tous les services | `./install_linux.sh restart` | `./install_mac.sh restart` | `.\install_win.ps1 restart` |
| `status` | Vérifier le statut de tous les services | `./install_linux.sh status` | `./install_mac.sh status` | `.\install_win.ps1 status` |
| `logs` | Afficher les journaux de tous les services | `./install_linux.sh logs` | `./install_mac.sh logs` | `.\install_win.ps1 logs` |
| `build` | Reconstruire toutes les images | `./install_linux.sh build` | `./install_mac.sh build` | `.\install_win.ps1 build` |
| `clean` | Nettoyer tous les conteneurs et images (opération dangereuse) | `./install_linux.sh clean` | `./install_mac.sh clean` | `.\install_win.ps1 clean` |
| `update` | Mettre à jour et redémarrer tous les services | `./install_linux.sh update` | `./install_mac.sh update` | `.\install_win.ps1 update` |
| `verify` | Vérifier que tous les services ont démarré avec succès | `./install_linux.sh verify` | `./install_mac.sh verify` | `.\install_win.ps1 verify` |

### Description détaillée des commandes

#### install - Installer les services

Utilisé pour le déploiement initial. Installe et démarre tous les modules de service :

**Linux/macOS**:
```bash
./install_linux.sh install    # Linux
./install_mac.sh install       # macOS
```

**Windows**:
```powershell
.\install_win.ps1 install
```

**Processus d'exécution**:
1. Vérifier l'environnement Docker et Docker Compose
2. Créer le réseau Docker `yfeieye-network`
3. Installer les modules dans l'ordre des dépendances :
   - Services de base (Nacos, PostgreSQL, Redis, etc.)
   - Service DEVICE
   - Service IA
   - Service VIDÉO
   - Service WEB
4. Afficher les statistiques des résultats de l'installation

#### start - Démarrer les services

Démarre tous les services installés :

**Linux/macOS**:
```bash
./install_linux.sh start    # Linux
./install_mac.sh start      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 start
```

#### stop - Arrêter les services

Arrête tous les services en cours d'exécution (arrêt dans l'ordre inverse) :

**Linux/macOS**:
```bash
./install_linux.sh stop    # Linux
./install_mac.sh stop      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 stop
```

#### restart - Redémarrer les services

Redémarre tous les services :

**Linux/macOS**:
```bash
./install_linux.sh restart    # Linux
./install_mac.sh restart      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 restart
```

#### status - Vérifier le statut

Affiche le statut de tous les services :

**Linux/macOS**:
```bash
./install_linux.sh status    # Linux
./install_mac.sh status      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 status
```

#### logs - Afficher les journaux

Affiche les journaux de tous les services (100 dernières lignes) :

**Linux/macOS**:
```bash
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 logs
```

#### build - Construire les images

Reconstruit les images Docker de tous les services (en utilisant l'option `--no-cache`) :

**Linux/macOS**:
```bash
./install_linux.sh build    # Linux
./install_mac.sh build      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 build
```

**Remarque** : Le processus de construction peut prendre du temps. Patientez.

#### clean - Nettoyer les services

**⚠️ Opération dangereuse** : Supprime tous les conteneurs, images et volumes de données

**Linux/macOS**:
```bash
./install_linux.sh clean    # Linux
./install_mac.sh clean      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 clean
```

Une confirmation sera demandée avant exécution. Tapez `y` ou `Y` pour continuer, toute autre entrée annulera l'opération.

**Éléments nettoyés**:
- Tous les conteneurs de services
- Toutes les images de services
- Tous les volumes de données
- Le réseau Docker `yfeieye-network`

#### update - Mettre à jour les services

Télécharge les dernières images et redémarre tous les services :

**Linux/macOS**:
```bash
./install_linux.sh update    # Linux
./install_mac.sh update      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 update
```

**Processus d'exécution**:
1. Télécharger les dernières images de chaque module
2. Redémarrer tous les services pour utiliser les nouvelles images

#### verify - Vérifier les services

Vérifie que tous les services sont démarrés normalement et accessibles :

**Linux/macOS**:
```bash
./install_linux.sh verify    # Linux
./install_mac.sh verify      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 verify
```

**Éléments vérifiés**:
- Vérifie si les ports des services sont accessibles
- Vérifie si les points de terminaison de santé répondent normalement
- Affiche les adresses d'accès aux services

**Exemple de sortie en cas de succès**:
```
[SUCCÈS] Tous les services fonctionnent normalement !

Adresses d'accès aux services :
  Services de base (Nacos) : http://localhost:8848/nacos
  Services de base (MinIO) : http://localhost:9000 (API), http://localhost:9001 (Console)
  Service Device (Gateway) : http://localhost:48080
  Service IA : http://localhost:5000
  Service Vidéo : http://localhost:6000
  Interface Web : http://localhost:8888
```

## Description des modules

### Services de base (`.scripts/docker`)

**Description** : Contient tous les services middleware nécessaires au fonctionnement de la plateforme

**Services inclus**:
- **Nacos** : Centre d'enregistrement des services et de configuration
- **PostgreSQL** : Base de données relationnelle
- **Redis** : Base de données cache
- **TDEngine** : Base de données de séries temporelles
- **Kafka** : File de messages
- **MinIO** : Service de stockage d'objets

**Méthode de déploiement**:
- **Linux** : Utiliser le script `install_middleware_linux.sh`
- **macOS** : Utiliser le script `install_middleware_mac.sh`
- **Windows** : Utiliser le script `install_middleware_win.ps1`

### Service DEVICE

**Description** : Service de gestion des appareils et de passerelle, fournissant les fonctions d'accès des appareils, de gestion des produits, d'étiquetage des données, de moteur de règles, etc.

**Stack technologique** : Java (Spring Cloud)

**Méthode de déploiement**:
- **Linux** : Utiliser le script `install_linux.sh`
- **macOS** : Utiliser le script `install_mac.sh`
- **Windows** : Utiliser le script `install_win.ps1`

**Fonctions principales**:
- Gestion des appareils
- Gestion des produits
- Étiquetage des données
- Moteur de règles
- Boutique d'algorithmes
- Gestion du système

### Service IA

**Description** : Service de traitement d'intelligence artificielle, responsable de l'analyse vidéo et de l'exécution des algorithmes d'IA

**Stack technologique** : Python

**Méthode de déploiement**:
- **Linux** : Utiliser le script `install_linux.sh`
- **macOS** : Utiliser le script `install_mac.sh`
- **Windows** : Utiliser le script `install_win.ps1`

**Fonctions principales**:
- Analyse vidéo
- Exécution d'algorithmes d'IA
- Inférence de modèles

### Service VIDÉO

**Description** : Service de traitement vidéo, responsable du traitement et de la transmission des flux vidéo

**Stack technologique** : Python

**Méthode de déploiement**:
- **Linux** : Utiliser le script `install_linux.sh`
- **macOS** : Utiliser le script `install_mac.sh`
- **Windows** : Utiliser le script `install_win.ps1`

**Fonctions principales**:
- Traitement des flux vidéo
- Transmission vidéo
- Service de streaming

### Service WEB

**Description** : Service frontal Web, fournissant l'interface utilisateur

**Stack technologique** : Vue.js

**Méthode de déploiement**:
- **Linux** : Utiliser le script `install_linux.sh`
- **macOS** : Utiliser le script `install_mac.sh`
- **Windows** : Utiliser le script `install_win.ps1`

**Fonctions principales**:
- Interface utilisateur
- Visualisation des données
- Interface de gestion du système

## Ports des services

| Module de service | Port | Description | Adresse d'accès |
|-------------------|------|-------------|-----------------|
| Nacos | 8848 | Centre d'enregistrement des services et de configuration | http://localhost:8848/nacos |
| API MinIO | 9000 | API de stockage d'objets | http://localhost:9000 |
| Console MinIO | 9001 | Console de stockage d'objets | http://localhost:9001 |
| Passerelle DEVICE | 48080 | Passerelle du service d'appareils | http://localhost:48080 |
| Service IA | 5000 | Service de traitement IA | http://localhost:5000 |
| Service VIDÉO | 6000 | Service de traitement vidéo | http://localhost:6000 |
| Interface Web | 8888 | Interface Web frontale | http://localhost:8888 |

### Points de terminaison de santé

Points de terminaison de santé des différents services :

| Module de service | Point de terminaison de santé |
|-------------------|-------------------------------|
| Services de base (Nacos) | `/nacos/actuator/health` |
| Service DEVICE | `/actuator/health` |
| Service IA | `/actuator/health` |
| Service VIDÉO | `/actuator/health` |
| Service WEB | `/health` |

## Questions fréquentes

### 1. Problème de permissions Docker

**Problème** : Message d'erreur "Aucune permission pour accéder au démon Docker" lors de l'exécution du script

**Solution**:

**Linux**:
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Se reconnecter ou exécuter
newgrp docker

# Vérifier les permissions
docker ps
```

**macOS**:
macOS ne nécessite généralement pas de configuration spécifique. Assurez-vous que Docker Desktop est en cours d'exécution.

**Windows**:
Sous Windows, Docker Desktop gère les permissions automatiquement. Assurez-vous que Docker Desktop est en cours d'exécution.

### 2. Port déjà utilisé

**Problème** : Message d'erreur indiquant que le port est déjà utilisé au démarrage du service

**Solution**:

**Linux**:
```bash
# Vérifier l'utilisation du port
sudo netstat -tulpn | grep <numéro_de_port>
# ou
sudo lsof -i :<numéro_de_port>

# Arrêter le processus utilisant le port ou modifier le port dans la configuration du service
```

**macOS**:
```bash
# Vérifier l'utilisation du port
lsof -i :<numéro_de_port>

# Arrêter le processus utilisant le port ou modifier le port dans la configuration du service
```

**Windows**:
```powershell
# Vérifier l'utilisation du port
netstat -ano | findstr :<numéro_de_port>

# Arrêter le processus utilisant le port ou modifier le port dans la configuration du service
```

### 3. Échec du démarrage du service

**Problème** : Échec du démarrage d'un module de service

**Solution**:

**Linux/macOS**:
```bash
# 1. Afficher les journaux des services
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS

# 2. Afficher les journaux détaillés d'un module spécifique
cd <répertoire_du_module>
docker-compose logs

# 3. Vérifier les ressources Docker
docker ps -a
docker images

# 4. Vérifier le réseau
docker network ls
docker network inspect yfeieye-network
```

**Windows**:
```powershell
# 1. Afficher les journaux des services
.\install_win.ps1 logs

# 2. Afficher les journaux détaillés d'un module spécifique
cd <répertoire_du_module>
docker-compose logs

# 3. Vérifier les ressources Docker
docker ps -a
docker images

# 4. Vérifier le réseau
docker network ls
docker network inspect yfeieye-network
```

### 4. Échec de la construction de l'image

**Problème** : Échec de la construction de l'image

**Solution**:

**Linux/macOS**:
```bash
# 1. Vérifier l'espace disque Docker
docker system df

# 2. Nettoyer les ressources inutilisées
docker system prune -a

# 3. Vérifier la connexion réseau (si nécessaire pour télécharger l'image de base)
ping registry-1.docker.io

# 4. Construire séparément l'image du module en échec
cd <répertoire_du_module>
docker-compose build --no-cache
```

**Windows**:
```powershell
# 1. Vérifier l'espace disque Docker
docker system df

# 2. Nettoyer les ressources inutilisées
docker system prune -a

# 3. Vérifier la connexion réseau (si nécessaire pour télécharger l'image de base)
Test-NetConnection registry-1.docker.io -Port 443

# 4. Construire séparément l'image du module en échec
cd <répertoire_du_module>
docker-compose build --no-cache
```

### 5. Service inaccessible

**Problème** : Le service est démarré mais inaccessible via le navigateur

**Solution**:

**Linux**:
```bash
# 1. Vérifier que le service fonctionne normalement
./install_linux.sh verify

# 2. Vérifier les paramètres du pare-feu
sudo ufw status
# Si nécessaire, ouvrir le port
sudo ufw allow <numéro_de_port>

# 3. Vérifier les journaux du service
./install_linux.sh logs

# 4. Vérifier le statut des conteneurs
docker ps
```

**macOS**:
```bash
# 1. Vérifier que le service fonctionne normalement
./install_mac.sh verify

# 2. Vérifier les paramètres du pare-feu (Préférences Système > Sécurité et confidentialité > Pare-feu)

# 3. Vérifier les journaux du service
./install_mac.sh logs

# 4. Vérifier le statut des conteneurs
docker ps
```

**Windows**:
```powershell
# 1. Vérifier que le service fonctionne normalement
.\install_win.ps1 verify

# 2. Vérifier les paramètres du pare-feu (Paramètres du pare-feu Windows)

# 3. Vérifier les journaux du service
.\install_win.ps1 logs

# 4. Vérifier le statut des conteneurs
docker ps
```

### 6. Perte de données

**Problème** : Perte de données après nettoyage des services

**Explication** : La commande `clean` supprime tous les volumes de données, entraînant une perte de données. Ce comportement est attendu.

**Mesures de prévention**:
- Sauvegarder les données importantes avant d'exécuter `clean`
- Utiliser la commande `clean` avec prudence en environnement de production
- Il est recommandé d'utiliser des outils de sauvegarde de volumes de données

## Gestion des journaux

### Emplacement des fichiers journaux

Les journaux d'exécution des scripts sont enregistrés dans le répertoire `.scripts/docker/logs/` :

- **Linux** : `install_linux_YYYYMMDD_HHMMSS.log`
- **macOS** : `install_mac_YYYYMMDD_HHMMSS.log`
- **Windows** : `install_win_YYYYMMDD_HHMMSS.log`

Le nom du fichier journal contient un horodatage, facilitant la distinction entre les différentes exécutions.

### Consultation des journaux

#### Consulter les journaux d'exécution des scripts

**Linux/macOS**:
```bash
# Afficher les fichiers journaux les plus récents
ls -lt .scripts/docker/logs/ | head -5

# Afficher un fichier journal spécifique
tail -f .scripts/docker/logs/install_linux_20240101_120000.log    # Linux
tail -f .scripts/docker/logs/install_mac_20240101_120000.log      # macOS
```

**Windows**:
```powershell
# Afficher les fichiers journaux les plus récents
Get-ChildItem .scripts\docker\logs\ | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# Afficher un fichier journal spécifique
Get-Content .scripts\docker\logs\install_win_20240101_120000.log -Wait
```

#### Consulter les journaux des conteneurs de services

**Linux/macOS**:
```bash
# Afficher les journaux de tous les services
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS

# Afficher les journaux d'un service spécifique (nécessite d'accéder au répertoire du module correspondant)
cd DEVICE
docker-compose logs -f
```

**Windows**:
```powershell
# Afficher les journaux de tous les services
.\install_win.ps1 logs

# Afficher les journaux d'un service spécifique (nécessite d'accéder au répertoire du module correspondant)
cd DEVICE
docker-compose logs -f
```

### Contenu des journaux

Les journaux des scripts contiennent :
- Horodatage d'exécution
- Commandes exécutées
- Résultats d'exécution de chaque module
- Messages d'erreur et d'avertissement
- Informations de statut des services

## Processus de déploiement recommandé

### Déploiement initial

#### Linux

1. **Préparation de l'environnement**
   ```bash
   # Vérifier les exigences système
   uname -a
   free -h
   df -h
   
   # Installer Docker et Docker Compose
   # Référence : https://docs.docker.com/get-docker/
   ```

2. **Obtenir le code**
   ```bash
   git clone <url-du-dépôt>
   cd yfeieye
   ```

3. **Exécuter l'installation**
   ```bash
   cd .scripts/docker
   chmod +x install_linux.sh
   ./install_linux.sh install
   ```

4. **Vérifier le déploiement**
   ```bash
   ./install_linux.sh verify
   ```

5. **Accéder aux services**
   - Ouvrir le navigateur et accéder aux adresses des services
   - Vérifier que les services fonctionnent normalement

#### macOS

1. **Préparation de l'environnement**
   ```bash
   # Vérifier les exigences système
   uname -a
   system_profiler SPHardwareDataType | grep Memory
   df -h
   
   # Installer Docker Desktop pour Mac
   # Référence : https://docs.docker.com/desktop/install/mac-install/
   ```

2. **Obtenir le code**
   ```bash
   git clone <url-du-dépôt>
   cd yfeieye
   ```

3. **Exécuter l'installation**
   ```bash
   cd .scripts/docker
   chmod +x install_mac.sh
   ./install_mac.sh install
   ```

4. **Vérifier le déploiement**
   ```bash
   ./install_mac.sh verify
   ```

5. **Accéder aux services**
   - Ouvrir le navigateur et accéder aux adresses des services
   - Vérifier que les services fonctionnent normalement

#### Windows

Pour le déploiement Windows, veuillez consulter le [Guide de déploiement Windows](平台Windows部署文档_fr.md) dédié, qui fournit des instructions étape par étape complètes. Le guide couvre les scénarios de déploiement local sur les systèmes Windows 10/11, notamment :

- La préparation de l'environnement et les exigences système
- L'installation et la configuration des middleware
- Les procédures de démarrage des services
- La configuration de la diffusion vidéo en continu
- Le dépannage et les problèmes courants

**Remarque** : Le guide de déploiement Windows se concentre principalement sur le déploiement local. Pour un déploiement basé sur Docker sous Windows, vous pouvez utiliser le script `install_win.ps1`, mais des instructions détaillées sont disponibles dans le guide de déploiement Windows.

### Maintenance quotidienne

#### Linux/macOS

1. **Démarrer les services**
   ```bash
   ./install_linux.sh start    # Linux
   ./install_mac.sh start      # macOS
   ```

2. **Arrêter les services**
   ```bash
   ./install_linux.sh stop    # Linux
   ./install_mac.sh stop      # macOS
   ```

3. **Redémarrer les services**
   ```bash
   ./install_linux.sh restart    # Linux
   ./install_mac.sh restart      # macOS
   ```

4. **Vérifier le statut**
   ```bash
   ./install_linux.sh status    # Linux
   ./install_mac.sh status      # macOS
   ```

5. **Afficher les journaux**
   ```bash
   ./install_linux.sh logs    # Linux
   ./install_mac.sh logs      # macOS
   ```

#### Windows

1. **Démarrer les services**
   ```powershell
   .\install_win.ps1 start
   ```

2. **Arrêter les services**
   ```powershell
   .\install_win.ps1 stop
   ```

3. **Redémarrer les services**
   ```powershell
   .\install_win.ps1 restart
   ```

4. **Vérifier le statut**
   ```powershell
   .\install_win.ps1 status
   ```

5. **Afficher les journaux**
   ```powershell
   .\install_win.ps1 logs
   ```

### Mise à jour du déploiement

#### Linux/macOS

1. **Récupérer le code le plus récent**
   ```bash
   git pull
   ```

2. **Mettre à jour les services**
   ```bash
   cd .scripts/docker
   ./install_linux.sh update    # Linux
   ./install_mac.sh update      # macOS
   ```

3. **Vérifier la mise à jour**
   ```bash
   ./install_linux.sh verify    # Linux
   ./install_mac.sh verify      # macOS
   ```

#### Windows

1. **Récupérer le code le plus récent**
   ```powershell
   git pull
   ```

2. **Mettre à jour les services**
   ```powershell
   cd .scripts\docker
   .\install_win.ps1 update
   ```

3. **Vérifier la mise à jour**
   ```powershell
   .\install_win.ps1 verify
   ```

## Notes importantes

1. **Exigences de version** : **Il est obligatoire** d'installer Docker v29.0.0+ et Docker Compose v2.35.0+. Les versions inférieures ne fonctionneront pas correctement.
2. **Exigences réseau** : Assurez-vous que le serveur peut accéder à Docker Hub ou au registre d'images configuré.
3. **Exigences de ressources** : Assurez-vous que le serveur dispose de suffisamment de CPU, de mémoire et d'espace disque.
4. **Conflits de ports** : Assurez-vous que les ports requis ne sont pas utilisés par d'autres services.
5. **Sauvegarde des données** : Effectuez une sauvegarde des données avant un déploiement en environnement de production.
6. **Configuration de sécurité** : Configurez les règles de pare-feu et de groupe de sécurité pour les environnements de production.
7. **Gestion des journaux** : Nettoyez régulièrement les anciens fichiers journaux pour éviter une saturation de l'espace disque.

## Support technique

Si vous rencontrez des problèmes, veuillez :

1. Consulter la section #questions-fréquentes de ce document
2. Afficher les journaux des services : `./install_all.sh logs`
3. Vérifier le statut Docker : `docker ps -a`
4. Soumettre un problème dans le dépôt du projet

---

**Version du document** : 1.0  
**Dernière mise à jour** : 2024-01-01  
**Emplacement des scripts** : `.scripts/docker/install_all.sh`