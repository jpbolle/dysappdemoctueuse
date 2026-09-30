/* ============================================================
   DactyloDys — CODE JAVASCRIPT
   Ce fichier contrôle le COMPORTEMENT de la page :
   boutons, appels à l'IA, synthèse vocale, sauvegarde...
   ============================================================ */

// Configuration de l'API Claude (Anthropic).
// La clé est fournie par l'utilisateur et stockée uniquement en local
// (localStorage du navigateur). Format attendu : sk-ant-...
let apiKey = localStorage.getItem('dactylo_dys_api_key') || "";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dactylodys-app';
const CLAUDE_MODEL = "claude-sonnet-5-5";

// Demander / enregistrer la clé API Claude (bouton ⚙ dans l'en-tête)
function configureApiKey() {
    const current = localStorage.getItem('dactylo_dys_api_key') || "";
    const entered = prompt(
        "Colle ici ta clé API Claude (créée sur https://platform.claude.com → API Keys).\n" +
        "Elle commence par « sk-ant- » et reste enregistrée uniquement sur cet ordinateur.",
        current
    );
    if (entered !== null) {
        apiKey = entered.trim();
        if (apiKey) {
            localStorage.setItem('dactylo_dys_api_key', apiKey);
            alert("Clé enregistrée ! Le correcteur magique est prêt.");
        } else {
            localStorage.removeItem('dactylo_dys_api_key');
        }
    }
}

// Vérifie qu'une clé est disponible avant tout appel à l'IA
function ensureApiKey() {
    if (!apiKey) {
        alert("Pour utiliser le correcteur magique, il faut d'abord enregistrer une clé API Claude.\nClique sur le bouton ⚙ « Clé API » en haut de la page.");
        return false;
    }
    return true;
}

// Appel générique à l'API Claude depuis le navigateur.
// L'en-tête anthropic-dangerous-direct-browser-access est requis pour
// les appels directs depuis une page web (CORS).
async function callClaude(userText, systemPrompt) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 16000,
            system: systemPrompt,
            messages: [{ role: "user", content: userText }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error?.message || `Erreur API (${response.status})`);
    }

    const data = await response.json();
    if (data.stop_reason === "refusal") {
        throw new Error("La demande a été refusée par le correcteur.");
    }
    let text = data.content?.find(b => b.type === "text")?.text || "";
    // Retirer d'éventuelles clôtures markdown (```html ... ```)
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/, "");
    return text.trim();
}

// Variables d'état globale de l'application
let currentFontSize = 14; // Taille de police par défaut (Verdana 14)
let originalText = "";
let selectedErrorSpan = null;
let errorsData = [];

// Initialisation de la page
window.addEventListener('DOMContentLoaded', () => {
    // Initialisation des icônes Lucide
    lucide.createIcons();
    
    // Chargement de texte éventuel stocké localement
    const savedText = localStorage.getItem('dactylo_dys_text');
    if (savedText) {
        document.getElementById('userTextArea').value = savedText;
        originalText = savedText;
    }

    // Double-clic sur un mot → illustration dans « Aide en image »
    setupDoubleClickIllustration();
});

// Fonction de sauvegarde temporaire locale de sécurité
function saveCurrentText() {
    const txt = document.getElementById('userTextArea').value;
    originalText = txt;
    localStorage.setItem('dactylo_dys_text', txt);
}

// Effacer le texte de la zone de saisie
function clearText() {
    if (confirm("Es-tu sûr de vouloir effacer tout ton texte pour en recommencer un nouveau ?")) {
        document.getElementById('userTextArea').value = "";
        document.getElementById('interactiveViewer').innerHTML = "";
        localStorage.removeItem('dactylo_dys_text');
        errorsData = [];
        updateErrorBadge(0);
        resetHelperPanel();
        resetImagePanel();
        switchTab('write');
    }
}

// Configuration de la police
function setFont(style) {
    const textarea = document.getElementById('userTextArea');
    const viewer = document.getElementById('interactiveViewer');
    const btnVerdana = document.getElementById('btnVerdana');
    const btnDys = document.getElementById('btnDys');

    if (style === 'dys') {
        textarea.style.fontFamily = "'Comic Sans MS', cursive, sans-serif";
        viewer.style.fontFamily = "'Comic Sans MS', cursive, sans-serif";
        textarea.style.letterSpacing = "0.08em";
        viewer.style.letterSpacing = "0.08em";
        
        btnDys.className = "px-3 py-1.5 rounded-md font-semibold bg-white text-blue-600 shadow-sm transition-all";
        btnVerdana.className = "px-3 py-1.5 rounded-md font-semibold text-slate-600 hover:text-slate-900 transition-all";
    } else {
        textarea.style.fontFamily = "'Verdana', Geneva, Tahoma, sans-serif";
        viewer.style.fontFamily = "'Verdana', Geneva, Tahoma, sans-serif";
        textarea.style.letterSpacing = "normal";
        viewer.style.letterSpacing = "normal";

        btnVerdana.className = "px-3 py-1.5 rounded-md font-semibold bg-white text-blue-600 shadow-sm transition-all";
        btnDys.className = "px-3 py-1.5 rounded-md font-semibold text-slate-600 hover:text-slate-900 transition-all";
    }
}

// Gestion de la taille de police
function changeFontSize(direction) {
    currentFontSize += direction;
    if (currentFontSize < 12) currentFontSize = 12;
    if (currentFontSize > 28) currentFontSize = 28;

    document.getElementById('fontSizeDisplay').textContent = currentFontSize + " pt";
    document.getElementById('userTextArea').style.fontSize = currentFontSize + "pt";
    document.getElementById('interactiveViewer').style.fontSize = currentFontSize + "pt";
}

// Ajuster l'espacement des lignes
function setSpacing(type) {
    const textarea = document.getElementById('userTextArea');
    const viewer = document.getElementById('interactiveViewer');
    const btnNormal = document.getElementById('btnSpacingNormal');
    const btnLarge = document.getElementById('btnSpacingLarge');

    if (type === 'large') {
        textarea.style.lineHeight = "2.2";
        viewer.style.lineHeight = "2.2";
        
        btnLarge.className = "p-1 px-2.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200";
        btnNormal.className = "p-1 px-2.5 rounded text-xs font-semibold hover:bg-slate-200 text-slate-700";
    } else {
        textarea.style.lineHeight = "1.6";
        viewer.style.lineHeight = "1.6";

        btnNormal.className = "p-1 px-2.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200";
        btnLarge.className = "p-1 px-2.5 rounded text-xs font-semibold hover:bg-slate-200 text-slate-700";
    }
}

// Changement de couleur d'arrière-plan pour un meilleur confort de lecture
function setBg(color) {
    const textarea = document.getElementById('userTextArea');
    const viewer = document.getElementById('interactiveViewer');
    
    if (color === 'cream') {
        textarea.style.backgroundColor = '#fcf8f2';
        viewer.style.backgroundColor = '#fcf8f2';
    } else if (color === 'pastel') {
        textarea.style.backgroundColor = '#f0f4f8';
        viewer.style.backgroundColor = '#f0f4f8';
    } else {
        textarea.style.backgroundColor = '#ffffff';
        viewer.style.backgroundColor = '#f8fafc';
    }
}

// Navigation entre les onglets
function switchTab(tab) {
    const tabWrite = document.getElementById('tabWrite');
    const tabCorrect = document.getElementById('tabCorrect');
    const panelWrite = document.getElementById('panelWrite');
    const panelCorrect = document.getElementById('panelCorrect');

    if (tab === 'write') {
        tabWrite.className = "flex-1 py-3 text-center font-bold text-sm border-b-2 border-blue-600 text-blue-600 bg-white transition-all";
        tabCorrect.className = "flex-1 py-3 text-center font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all flex items-center justify-center gap-2";
        panelWrite.classList.remove('hidden');
        panelWrite.classList.add('flex');
        panelCorrect.classList.add('hidden');
        panelCorrect.classList.remove('flex');
    } else {
        tabCorrect.className = "flex-1 py-3 text-center font-bold text-sm border-b-2 border-blue-600 text-blue-600 bg-white transition-all flex items-center justify-center gap-2";
        tabWrite.className = "flex-1 py-3 text-center font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all";
        panelCorrect.classList.remove('hidden');
        panelCorrect.classList.add('flex');
        panelWrite.classList.add('hidden');
        panelWrite.classList.remove('flex');
    }
}

// Mise à jour du badge affichant le nombre d'erreurs
function updateErrorBadge(count) {
    const badge = document.getElementById('badgeErrorCount');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Réinitialiser la barre latérale d'outils de correction
function resetHelperPanel() {
    document.getElementById('helperDefaultState').classList.remove('hidden');
    document.getElementById('helperActiveState').classList.add('hidden');
    selectedErrorSpan = null;
}

// Réinitialiser l'affichage d'aide d'image
function resetImagePanel() {
    document.getElementById('imagePlaceholder').classList.remove('hidden');
    document.getElementById('imageLoader').classList.add('hidden');
    document.getElementById('visualAidImage').classList.add('hidden');
}

// ==========================================
//  APPEL ET INTÉGRATION DE L'API GEMINI
// ==========================================

async function triggerMagicCorrection() {
    const textToCorrect = document.getElementById('userTextArea').value.trim();
    if (!textToCorrect) {
        alert("Commence d'abord par saisir ou copier un texte à vérifier !");
        return;
    }
    if (!ensureApiKey()) return;

    // Basculer sur l'onglet de correction
    switchTab('correct');
    
    // Afficher le loader et cacher le reste
    document.getElementById('correctionLoader').classList.remove('hidden');
    document.getElementById('noErrorsPlaceholder').classList.add('hidden');
    document.getElementById('interactiveViewer').classList.add('hidden');
    resetHelperPanel();
    resetImagePanel();

    // Construction du prompt intelligent pour cibler les besoins des élèves dyslexiques
    const systemPrompt = `Tu es un tuteur de français bienveillant, expert en remédiation pour les élèves de 8 à 25 ans atteints de dyslexie et dysorthographie.
Ton but est d'analyser le texte fourni et de retourner le texte EXACTEMENT d'origine avec les mots erronés enveloppés dans une balise <span class="error-word" ...> afin que nous puissions les rendre interactifs.

RÈGLES IMPORTANTES :
1. Tu dois entourer TOUS les mots comportant une erreur (orthographe d'usage, grammaire, mauvaise terminaison, confusion homophonique récurrente) de cette balise :
   <span class="error-word" data-suggestions="Suggestion1, Suggestion2, Suggestion3, ..." data-explanation="Explication simple">mot_erroné</span>

2. Fournis jusqu'à 7 suggestions (au minimum 2 ou 3 selon le contexte, mais au maximum 7) ordonnées de la plus pertinente à la moins pertinente. Sépare ces suggestions par des virgules dans l'attribut data-suggestions.
3. L'explication dans l'attribut data-explanation doit être extrêmement simple, courte, positive, réconfortante et facile à comprendre pour un jeune élève (exemples : "On écrit 'et' quand on peut dire 'et puis'", "Ici c'est pluriel, donc on ajoute un 's' muet").
4. Ne modifie pas le reste de la ponctuation ni la structure générale du texte, pour ne pas désorienter l'élève.
5. S'il n'y a aucune faute, retourne le texte brut inchangé.
6. Ne génère aucun autre texte d'introduction ou de conclusion, renvoie directement le HTML.`;

    try {
        // Utilisation de l'exponentielle backoff pour la fiabilité de l'API
        const correctedHtml = await fetchClaudeWithBackoff(textToCorrect, systemPrompt);
        
        document.getElementById('correctionLoader').classList.add('hidden');
        
        if (correctedHtml && correctedHtml.includes('error-word')) {
            // Des erreurs ont été trouvées
            const viewer = document.getElementById('interactiveViewer');
            viewer.innerHTML = correctedHtml;
            viewer.classList.remove('hidden');

            // Attacher les écouteurs d'événements de clic sur chaque mot erroné
            const errorSpans = viewer.querySelectorAll('.error-word');
            updateErrorBadge(errorSpans.length);

            errorSpans.forEach((span, index) => {
                span.setAttribute('id', `error-${index}`);
                span.addEventListener('click', () => selectErrorWord(span));
            });
        } else {
            // Aucune erreur trouvée
            document.getElementById('interactiveViewer').innerHTML = textToCorrect;
            document.getElementById('interactiveViewer').classList.remove('hidden');
            document.getElementById('noErrorsPlaceholder').classList.remove('hidden');
            updateErrorBadge(0);
        }

    } catch (error) {
        console.error("Erreur d'analyse : ", error);
        document.getElementById('correctionLoader').classList.add('hidden');
        document.getElementById('interactiveViewer').innerHTML = `<p class="text-red-600 font-bold">Mince, le correcteur magique a rencontré un problème temporaire. S'il te plaît, réessaie.</p><div class="mt-4 text-sm text-slate-700">${textToCorrect}</div>`;
        document.getElementById('interactiveViewer').classList.remove('hidden');
    }
}

// Fonction d'appel robuste à Claude avec exponentielle backoff (jusqu'à 5 essais)
async function fetchClaudeWithBackoff(query, systemPrompt, retries = 5, delay = 1000) {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await callClaude(query, systemPrompt);
        } catch (e) {
            lastError = e;
            // Erreurs non réessayables : clé invalide, requête malformée, refus
            const msg = String(e.message || "");
            if (msg.includes("401") || msg.includes("invalid") || msg.includes("authentication") || msg.includes("refusée")) {
                throw e;
            }
        }

        // Attente exponentielle
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
    }

    throw lastError || new Error("Toutes les tentatives de communication avec le correcteur ont échoué.");
}

// ==========================================
//  GESTION DES INTERACTIONS DE CORRECTION
// ==========================================

// Sélection d'un mot mal orthographié au clic de l'utilisateur
function selectErrorWord(spanElement) {
    // Retirer la surbrillance de l'ancienne sélection
    if (selectedErrorSpan) {
        selectedErrorSpan.classList.remove('bg-red-200');
    }

    selectedErrorSpan = spanElement;
    selectedErrorSpan.classList.add('bg-red-200');

    // Récupérer les données de correction stockées dans les attributs HTML
    const originalWord = spanElement.innerText;
    const suggestionsRaw = spanElement.getAttribute('data-suggestions') || '';
    const explanation = spanElement.getAttribute('data-explanation') || 'Pas d\'explication supplémentaire pour cette règle.';

    // Formater la liste de suggestions en tableau
    const suggestions = suggestionsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Mettre à jour l'état de la boîte à outils latérale
    document.getElementById('originalWordDisplay').textContent = originalWord;
    document.getElementById('explanationDisplay').textContent = explanation;

    const suggestionsListContainer = document.getElementById('suggestionsList');
    suggestionsListContainer.innerHTML = '';

    if (suggestions.length === 0) {
        suggestionsListContainer.innerHTML = '<p class="text-xs text-slate-500 italic">Aucune suggestion disponible.</p>';
    } else {
        // Créer un bouton pour chaque suggestion de correction (maximum 7)
        suggestions.slice(0, 7).forEach((sug, index) => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 hover:border-blue-300 p-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-between";
            btn.innerHTML = `
                <span>${sug}</span>
                <span class="text-[10px] bg-blue-200 px-2 py-0.5 rounded text-blue-800 font-semibold">Option ${index + 1}</span>
            `;
            btn.onclick = () => applyCorrection(sug);
            suggestionsListContainer.appendChild(btn);
        });
    }

    // Afficher l'état actif dans l'aide de droite
    document.getElementById('helperDefaultState').classList.add('hidden');
    document.getElementById('helperActiveState').classList.remove('hidden');

    // Réinitialiser le visualiseur d'images pour le nouveau mot sélectionné
    resetImagePanel();
}

// Appliquer la correction choisie par l'élève
function applyCorrection(correctedWord) {
    if (!selectedErrorSpan) return;

    // Remplacer le contenu HTML du span par le mot corrigé, et enlever le style d'erreur
    selectedErrorSpan.outerHTML = correctedWord;

    // Recalculer le badge d'erreurs restantes
    const viewer = document.getElementById('interactiveViewer');
    const remainingErrors = viewer.querySelectorAll('.error-word');
    updateErrorBadge(remainingErrors.length);

    // Mettre à jour également le textarea d'écriture d'origine pour que la synchronisation soit parfaite
    updateTextAreaFromInteractive();

    // Masquer ou réinitialiser le panneau d'aide
    resetHelperPanel();
    resetImagePanel();
}

// Synchroniser le textarea avec les corrections effectuées
function updateTextAreaFromInteractive() {
    const viewer = document.getElementById('interactiveViewer');
    // Créer un clone temporaire pour extraire le texte sans altérer l'interactivité
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = viewer.innerHTML;
    
    // Récupérer le texte propre
    const textContent = tempDiv.innerText || tempDiv.textContent;
    document.getElementById('userTextArea').value = textContent;
    originalText = textContent;
    localStorage.setItem('dactylo_dys_text', textContent);
}

// ==========================================
//  FONCTIONS D'AIDE ET SYNTHÈSE VOCALE (DYS)
// ==========================================

// Synthèse vocale de relecture de texte complète
function speakText() {
    const textToSpeak = document.getElementById('userTextArea').value;
    if (!textToSpeak) {
        alert("Il n'y a aucun texte à lire ! Saisis d'abord ton texte.");
        return;
    }

    // Arrêter toute lecture en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85; // Rythme de parole légèrement ralenti, adapté pour le public Dys

    window.speechSynthesis.speak(utterance);
}

// Fonctionnalité pour copier le texte et ouvrir le site Scribens directement en cas de besoin
function copyAndOpenScribens() {
    const textToCopy = document.getElementById('userTextArea').value;
    
    // Copier le texte de l'utilisateur dans le presse-papiers
    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    // Ouvrir Scribens dans une nouvelle fenêtre
    const scribensUrl = "https://www.scribens.fr/?gad_source=1&gad_campaignid=21825644776&gbraid=0AAAAADl_jxkXA5JphmEV_Mcff5mR8SnbK&gclid=EAIaIQobChMIteaFrJHwlAMVo7ODBx1KCCd3EAAYASAAEgKIhfD_BwE#";
    window.open(scribensUrl, '_blank');
}

// ==========================================
//  AIDE VISUELLE PAR IMAGE (IMAGEN — API GEMINI)
// ==========================================
// Deux modes :
//  - App lancée avec server.py (http://localhost:8000) : la clé Gemini est
//    CACHÉE dans le fichier .env du serveur, le navigateur ne la voit jamais.
//  - App ouverte en double-clic (file://) : repli sur env.js (clé locale,
//    ignorée par git mais visible dans le navigateur).

function getGeminiApiKey() {
    return (typeof window.ENV !== 'undefined' && window.ENV.GEMINI_API_KEY) || "";
}

// L'app est-elle servie par server.py ? (http/https = oui, file:// = non)
function isServedByProxy() {
    return location.protocol === 'http:' || location.protocol === 'https:';
}

// Génère l'image d'un mot et renvoie son contenu en base64 (PNG).
// Fonctionnement en DEUX étapes pour qu'aucun texte n'apparaisse dans l'image :
//  1. Gemini (texte) décrit une scène en anglais SANS citer le mot français
//     (verbe → action, nom abstrait → métaphore, le mot peut être mal orthographié) ;
//  2. Imagen dessine cette scène — comme il ne voit jamais le mot, il ne peut
//     pas l'écrire (ni reproduire la faute) dans l'image.
async function generateImage(word) {
    if (isServedByProxy()) {
        // Mode serveur : les deux étapes sont faites par server.py, clé cachée dans .env
        const response = await fetch('/api/imagen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word })
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.image) {
            throw new Error(data?.error || "Erreur du serveur d'images.");
        }
        return data.image;
    }

    // Mode double-clic : les deux étapes sont faites ici, avec la clé de env.js
    const geminiKey = getGeminiApiKey();
    if (!geminiKey) {
        throw new Error("CLE_MANQUANTE");
    }

    // Étape 1 : description de la scène (sans le mot français)
    const instruction = `Here is a French word written by a dyslexic child (the spelling may be wrong): "${word}". ` +
        "Infer the intended French word, then write ONE short English sentence (max 30 words) " +
        "describing a simple cartoon scene that conveys its meaning to a child: " +
        "for a verb, someone performing the action; for an abstract noun, one obvious visual metaphor; " +
        "for a concrete noun, the object or animal itself. " +
        "Reply with ONLY that sentence. Never mention words, letters, text, signs or writing.";
    const txtResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }] })
    });
    if (!txtResponse.ok) throw new Error("Erreur de l'API Gemini (description).");
    const txtData = await txtResponse.json();
    const scene = txtData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!scene) throw new Error("Description de scène vide.");

    // Étape 2 : dessin de la scène (3 essais — l'API renvoie parfois un 503 passager)
    const promptImage = "A wordless children's picture-book cartoon illustration, warm and friendly, " +
        "soft plain background, simple shapes, no complex details, " +
        `absolutely no text and no letters anywhere: ${scene}`;
    for (let essai = 1; essai <= 3; essai++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: promptImage }],
                parameters: { sampleCount: 1 }
            })
        });
        if (response.ok) {
            const data = await response.json();
            const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
            if (base64Data) return base64Data;
        }
        if (essai < 3) await new Promise(res => setTimeout(res, 1500));
    }
    throw new Error("Erreur de l'API Imagen.");
}

// Illustre un mot dans l'encadré « Aide en image »
async function illustrateWord(word) {
    word = (word || "").trim();
    if (!word) return;

    // Afficher le loader d'images
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    const imageLoader = document.getElementById('imageLoader');
    const visualAidImage = document.getElementById('visualAidImage');

    imagePlaceholder.classList.add('hidden');
    imageLoader.classList.remove('hidden');
    visualAidImage.classList.add('hidden');

    try {
        const base64Data = await generateImage(word);
        visualAidImage.src = `data:image/png;base64,${base64Data}`;

        // Afficher l'image
        imageLoader.classList.add('hidden');
        visualAidImage.classList.remove('hidden');

    } catch (error) {
        console.error("Impossible de charger l'image d'aide :", error);
        imageLoader.classList.add('hidden');
        imagePlaceholder.classList.remove('hidden');
        if (String(error.message) === "CLE_MANQUANTE") {
            alert("L'aide en image n'est pas configurée.\nSoit lance l'app avec « python3 server.py » (clé cachée dans .env),\nsoit renseigne GEMINI_API_KEY dans env.js (voir README).");
        } else {
            alert("Oups ! Nous n'avons pas réussi à créer l'image d'illustration pour le moment. Réessaie avec un autre mot simple.");
        }
    }
}

// Bouton « Voir l'image du mot choisi » de la boîte à outils de correction
async function visualizeSelectedWord() {
    if (!selectedErrorSpan) {
        alert("Choisis d'abord un mot souligné en rouge dans l'onglet « 2. Je corrige mes erreurs »,\nou double-clique simplement sur un mot de ton texte pour voir son dessin.");
        return;
    }

    // Illustrer directement le mot sélectionné dans le panneau de correction
    const wordToIllustrate = document.getElementById('originalWordDisplay').textContent;
    await illustrateWord(wordToIllustrate);
}

// Double-clic sur un mot (zone d'écriture ou vue de correction) → dessin direct
function setupDoubleClickIllustration() {
    // Dans la zone d'écriture : le double-clic sélectionne le mot
    document.getElementById('userTextArea').addEventListener('dblclick', (e) => {
        const ta = e.target;
        const word = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
        if (word && word.length <= 40) illustrateWord(word);
    });

    // Dans la vue interactive de correction
    document.getElementById('interactiveViewer').addEventListener('dblclick', () => {
        const word = (window.getSelection()?.toString() || "").trim();
        if (word && word.length <= 40) illustrateWord(word);
    });
}
