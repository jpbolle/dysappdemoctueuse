# DactyloDys — Mon compagnon d'écriture bienveillant

Outil d'aide à l'écriture et à la correction orthographique pour élèves **dyslexiques et dysorthographiques** (8 à 25 ans).

Application transposée depuis Gemini Canvas (lien partagé : `gemini.google.com/share/0df7b916fd79`) le 8 juillet 2026.

## Contenu du dossier

L'application est découpée en **3 fichiers** pour bien distinguer les trois langages du web (idéal en formation) :

| Fichier | Langage | Rôle |
|---|---|---|
| `index.html` | HTML | La **structure** de la page : titres, boutons, zones de texte |
| `style.css` | CSS | L'**apparence** : couleurs, polices, espacements, animations |
| `script.js` | JavaScript | Le **comportement** : clics, appels à l'IA, synthèse vocale, sauvegarde |

Fichiers de configuration et annexes :

| Fichier | Rôle |
|---|---|
| `server.py` | Mini-serveur local (optionnel) : sert l'app et **cache la clé Gemini** côté serveur |
| `.env` | Clé API Gemini utilisée par `server.py` — **ignoré par git** (à créer depuis `.env.example`) |
| `env.js` | Clé Gemini pour le mode « double-clic » sans serveur — **ignoré par git** (à créer depuis `env.example.js`) |
| `env.example.js` / `.env.example` | Modèles à copier (sans clé) |
| `.gitignore` | Empêche la publication de `env.js` / `.env` |

## Démarrage rapide

### Mode recommandé : avec le serveur (clé Gemini vraiment cachée)

1. Copier `.env.example` vers `.env` et y coller la clé Gemini (https://aistudio.google.com/apikey) :
   ```
   GEMINI_API_KEY=votre_clé_ici
   ```
2. Dans le Terminal, depuis ce dossier : `python3 server.py`
3. Ouvrir **http://localhost:8000** dans le navigateur.

Dans ce mode, l'appel Imagen est fait **par le serveur** : la clé reste dans `.env` sur l'ordinateur et n'apparaît jamais dans le navigateur (même via les outils de développement).

### Mode simple : double-clic sur `index.html` (sans serveur)

Tout fonctionne aussi en ouvrant directement `index.html`. Pour l'aide en image dans ce mode, renseigner la clé dans `env.js` (copie de `env.example.js`). ⚠️ Dans ce mode la clé est protégée du dépôt git, mais reste visible par un utilisateur curieux via les outils de développement — préférer le mode serveur pour un usage en classe.

### Correcteur de texte (Claude) — dans les deux modes

Chaque utilisateur enregistre **sa propre clé** :
- Créer une clé sur https://platform.claude.com (section *API Keys* — la clé commence par `sk-ant-`).
- Cliquer sur le bouton **⚙ Clé API** en haut à droite de l'app et la coller.
- La clé est stockée uniquement dans le navigateur (localStorage), jamais envoyée ailleurs qu'à Anthropic.

Ensuite : écrire un texte, cliquer sur **« Vérifier mon écriture »**, puis cliquer sur les mots soulignés en rouge pour voir les suggestions.

## Fonctionnalités

- **Zone d'écriture adaptée dys** : police Verdana 14 pt par défaut, mode « Format Dys (Aéré) », taille de texte réglable (12–28 pt), interlignage normal/grand, fonds blanc / crème / bleu pastel.
- **Correction magique par IA** (Claude, modèle `claude-sonnet-5-5`) : les mots erronés sont soulignés en rouge ondulé ; un clic affiche jusqu'à **7 suggestions** classées par pertinence + une **explication simplifiée et bienveillante** de la règle.
- **Application de la correction en un clic**, avec synchronisation automatique du texte d'origine.
- **Synthèse vocale** (« Écouter ») : relecture du texte en français à débit ralenti (0.85), adapté au public dys.
- **Aide en image** (Gemini Imagen) : génération d'une illustration simple d'un mot pour lever les confusions de sens.
- **Passerelle Scribens** : copie le texte dans le presse-papiers et ouvre le correcteur gratuit Scribens.fr.
- **Sauvegarde automatique locale** du texte en cours (localStorage) — rien n'est perdu si la page se ferme.

## Adaptations par rapport à la version Gemini Canvas

La version originale dépendait de l'environnement Canvas (clé API injectée automatiquement). Adaptations réalisées, tout le reste est identique :

1. **Correction de texte basculée sur Claude** (`claude-sonnet-5-5`, API Anthropic appelée directement depuis le navigateur) : bouton « ⚙ Clé API » + stockage local + message clair si la clé manque, appels avec 5 tentatives et backoff exponentiel.
2. **Aide en image conservée sur Gemini Imagen** (`imagen-4.0-generate-001`), avec la clé déportée dans `env.js` (ignoré par git) au lieu d'être dans le code.
3. **Garde-fous** : vérification de la présence de chaque clé avant l'appel IA correspondant, gestion des erreurs API (dont les refus).

⚠️ La génération d'images Imagen peut nécessiter un compte Google avec facturation activée. Si l'image échoue, le reste de l'app fonctionne normalement.
⚠️ La synthèse vocale, le lien Scribens et la sauvegarde automatique fonctionnent sans aucune clé.
