# 🦠 Alerte : le virus Papyrus-23 a frappé DactyloDys

DactyloDys aide des élèves **dyslexiques et dysorthographiques** à écrire.
Cette nuit, un virus s'est glissé dans son code. Il n'a rien volé… il a fait pire :
l'app fonctionne encore, mais elle est devenue **laide, illisible et inutilisable** pour les
élèves à qui elle est destinée. Couleurs criardes, texte qui danse, boutons muets, réglages
sabotés : le virus a laissé des traces partout.

**Ta mission, agent·e :** traquer chaque trace du virus et rendre l'app à ses élèves.
Le fichier `README.md` décrit l'app **telle qu'elle était avant l'infection** : c'est ta référence.
Ton arme : l'IA dans ton éditeur de code — mais c'est toi qui gardes la main.

---

## Étape 1 — Récupère ta copie

1. Sur GitHub, ouvre le dépôt de ton formateur.
2. Clique sur **« Use this template » → « Create a new repository »** (ou **« Fork »**).
3. Donne-lui un nom, par exemple `dactylodys-reparee`, et crée-le dans **ton** compte.

## Étape 2 — Ouvre-la dans ton éditeur

1. Ouvre **Antigravity** (ou Visual Studio Code).
2. Clone ton dépôt : *Clone Git Repository*, colle l'adresse de **ton** dépôt, choisis un dossier.
3. Ouvre le dossier. Tu dois voir `index.html`, `style.css`, `script.js`, `server.py`.

## Étape 3 — Lance le serveur dans le terminal

1. Ouvre le terminal intégré (menu *Terminal → New Terminal*).
2. Tape :
   ```
   python3 server.py
   ```
   (sous Windows : `python server.py`)
3. Ouvre **http://localhost:8000** dans ton navigateur.
4. Pour arrêter le serveur : **Ctrl + C** dans le terminal.

## Étape 4 — Traque le virus et répare l'app

Demande à l'IA de t'aider, mais **garde la main** : relis ce qu'elle propose et vérifie à l'écran.
Les indices laissés par le virus — par où commencer :

- Un élève dys arrive-t-il à **lire** cette page ? (couleurs, contrastes, police, taille, interlignage…)
- Les réglages **Taille**, **Format Dys** et **Espacement** font-ils vraiment quelque chose ?
- Peux-tu tout faire **au clavier seul** (touche Tab, puis Entrée) ? Vois-tu où tu es ?
- Que dirait un **lecteur d'écran** de cette page ? Dans quelle langue la lirait-il ?
- Et sur un **Chromebook** ou un **téléphone** ?
- Un élève **daltonien** repère-t-il les mots à corriger ?

Astuce : ouvre les **outils de développement** du navigateur (clic droit → *Inspecter*) pour voir
quelle règle CSS s'applique à un élément.

## Étape 5 — Enregistre et publie ton travail

Dans le terminal (arrête d'abord le serveur avec Ctrl + C, ou ouvre un second terminal) :

```
git add .
git commit -m "fix: éradiquer le virus Papyrus-23 (lisibilité et accessibilité)"
git push
```

Recharge la page de ton dépôt sur GitHub : l'app réparée y est. Virus éradiqué ! 🎉
Colle le lien de ton dépôt dans la card « Défi » de la formation.

> 🔒 Ne publie jamais de clé API : les fichiers `.env` et `env.js` sont exclus par `.gitignore`.
