#!/usr/bin/env python3
"""
DactyloDys — mini-serveur local.

Rôle :
  1. Servir les fichiers de l'application (index.html, style.css, script.js).
  2. Faire l'appel à l'API Imagen (Gemini) À LA PLACE du navigateur,
     avec la clé lue dans le fichier .env — la clé ne quitte jamais
     cet ordinateur et n'est jamais visible dans le navigateur.

Utilisation :
  1. Créer un fichier .env à côté de ce script contenant :
         GEMINI_API_KEY=votre_clé_ici
  2. Lancer :   python3 server.py
  3. Ouvrir :   http://localhost:8000

Aucune installation nécessaire : uniquement la bibliothèque standard Python.
"""
import json
import os
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DOSSIER = os.path.dirname(os.path.abspath(__file__))
PORT = 8000


def charger_env():
    """Lit le fichier .env (format CLE=valeur, une par ligne)."""
    env = {}
    chemin = os.path.join(DOSSIER, ".env")
    try:
        with open(chemin, encoding="utf-8") as f:
            for ligne in f:
                ligne = ligne.strip()
                if ligne and not ligne.startswith("#") and "=" in ligne:
                    cle, valeur = ligne.split("=", 1)
                    env[cle.strip()] = valeur.strip().strip("\"'")
    except FileNotFoundError:
        pass
    return env


ENV = charger_env()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DOSSIER, **kwargs)

    def do_POST(self):
        if self.path != "/api/imagen":
            self.send_error(404)
            return

        cle = ENV.get("GEMINI_API_KEY", "")
        if not cle:
            self._json(500, {"error": "GEMINI_API_KEY manquante dans le fichier .env"})
            return

        longueur = int(self.headers.get("Content-Length", 0))
        try:
            corps = json.loads(self.rfile.read(longueur))
            mot = str(corps.get("word", "")).strip()[:60]
        except Exception:
            self._json(400, {"error": "Requête invalide"})
            return
        if not mot:
            self._json(400, {"error": "Mot manquant"})
            return

        # Étape 1 : décrire une scène (en anglais, SANS le mot français) —
        # ainsi Imagen ne peut pas écrire le mot dans l'image.
        instruction = (
            f'Here is a French word written by a dyslexic child (the spelling may be wrong): "{mot}". '
            "Infer the intended French word, then write ONE short English sentence (max 30 words) "
            "describing a simple cartoon scene that conveys its meaning to a child: "
            "for a verb, someone performing the action; for an abstract noun, one obvious visual metaphor; "
            "for a concrete noun, the object or animal itself. "
            "Reply with ONLY that sentence. Never mention words, letters, text, signs or writing."
        )
        try:
            scene = self._gemini_texte(cle, instruction)
        except Exception as e:
            self._json(502, {"error": f"Erreur Gemini (description) : {e}"})
            return

        # Étape 2 : dessiner la scène (le mot français n'apparaît nulle part)
        prompt_image = (
            "A wordless children's picture-book cartoon illustration, warm and friendly, "
            "soft plain background, simple shapes, no complex details, "
            f"absolutely no text and no letters anywhere: {scene}"
        )
        requete = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"imagen-4.0-generate-001:predict?key={cle}",
            data=json.dumps({
                "instances": [{"prompt": prompt_image}],
                "parameters": {"sampleCount": 1},
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        # Jusqu'à 3 essais : l'API Imagen renvoie parfois un 503 passager
        derniere_erreur = None
        for _ in range(3):
            try:
                with urllib.request.urlopen(requete, timeout=90) as reponse:
                    data = json.loads(reponse.read())
                image = data.get("predictions", [{}])[0].get("bytesBase64Encoded")
                if image:
                    self._json(200, {"image": image, "scene": scene})
                    return
                derniere_erreur = "Réponse Imagen invalide"
            except Exception as e:
                derniere_erreur = f"Erreur Imagen : {e}"
        self._json(502, {"error": derniere_erreur})

    def _gemini_texte(self, cle, texte):
        """Petit appel texte à Gemini (gemini-2.5-flash) ; renvoie la réponse brute."""
        requete = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={cle}",
            data=json.dumps({"contents": [{"parts": [{"text": texte}]}]}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            data = json.loads(reponse.read())
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    def _json(self, code, obj):
        contenu = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(contenu)))
        self.end_headers()
        self.wfile.write(contenu)


if __name__ == "__main__":
    if not ENV.get("GEMINI_API_KEY"):
        print("⚠️  Pas de fichier .env (ou GEMINI_API_KEY vide) : l'aide en image sera désactivée.")
    print(f"✅ DactyloDys disponible sur http://localhost:{PORT}  (Ctrl+C pour arrêter)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
