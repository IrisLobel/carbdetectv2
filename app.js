// ============================================
// CarbDetect — Logique de l'application
// ============================================

// ----- 1. References aux elements HTML -----
// On recupere tous les elements dont on a besoin depuis le HTML
const fileInput   = document.getElementById('file-input');   // <input> pour choisir un fichier
const dropZone    = document.getElementById('drop-zone');    // Zone de drag & drop
const previewWrap = document.getElementById('preview-wrap'); // Conteneur de l'apercu image
const previewImg  = document.getElementById('preview-img');  // Balise <img> pour l'apercu
const btnAnalyse  = document.getElementById('btn-analyse');  // Bouton "Analyser"
const btnRemove   = document.getElementById('btn-remove');   // Bouton "Supprimer" l'image
const btnReset    = document.getElementById('btn-reset');    // Bouton "Analyser une autre photo"
const loader      = document.getElementById('loader');       // Spinner de chargement
const errorBox    = document.getElementById('error-box');    // Boite d'affichage des erreurs
const results     = document.getElementById('results');      // Section des resultats

// ----- 2. Variables d'etat -----
// Ces variables gardent en memoire l'image selectionnee
let base64Image = null;            // L'image encodee en base64 (texte)
let mediaType   = 'image/jpeg';    // Le type de fichier (jpeg, png, webp...)


// ============================================
// 3. GESTION DU DRAG & DROP
// ============================================

// Quand on survole la zone avec un fichier
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();                        // Empeche le navigateur d'ouvrir le fichier
  dropZone.classList.add('drag-over');        // Ajoute un style visuel "survol"
});

// Quand on quitte la zone
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');     // Retire le style "survol"
});

// Quand on lache un fichier dans la zone
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];      // Recupere le premier fichier depose
  if (file) loadFile(file);                  // Charge le fichier si il existe
});


// ============================================
// 4. GESTION DU CLIC SUR "PARCOURIR"
// ============================================

// Quand l'utilisateur choisit un fichier via le bouton classique
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});


// ============================================
// 5. CHARGEMENT D'UN FICHIER IMAGE
// ============================================

/**
 * Charge un fichier image, l'encode en base64, et affiche l'apercu.
 *
 * @param {File} file - Le fichier image selectionne par l'utilisateur
 */
function loadFile(file) {
  // Verifie que c'est bien une image
  if (!file.type.startsWith('image/')) {
    return showError("Veuillez choisir un fichier image.");
  }

  mediaType = file.type || 'image/jpeg';

  // FileReader permet de lire le contenu du fichier
  const reader = new FileReader();

  // Quand la lecture est terminee :
  reader.onload = (e) => {
    const dataURL = e.target.result;       // Ex: "data:image/jpeg;base64,/9j/4AAQ..."
    base64Image = dataURL.split(',')[1];   // On garde uniquement la partie base64
    previewImg.src = dataURL;              // Affiche l'image dans l'apercu
    previewWrap.style.display = 'block';   // Montre l'apercu
    dropZone.style.display = 'none';       // Cache la zone d'upload
    btnAnalyse.disabled = false;           // Active le bouton "Analyser"
    hideError();                           // Cache les erreurs precedentes
    results.style.display = 'none';        // Cache les anciens resultats
  };

  // Lance la lecture du fichier en tant que Data URL (base64)
  reader.readAsDataURL(file);
}


// ============================================
// 6. REINITIALISATION (supprimer / recommencer)
// ============================================

btnRemove.addEventListener('click', resetUpload);
btnReset.addEventListener('click', resetUpload);

/**
 * Remet l'interface a son etat initial (pas d'image, pas de resultats).
 */
function resetUpload() {
  base64Image = null;
  previewImg.src = '';
  previewWrap.style.display = 'none';    // Cache l'apercu
  dropZone.style.display = 'block';      // Re-affiche la zone d'upload
  btnAnalyse.disabled = true;            // Desactive le bouton "Analyser"
  results.style.display = 'none';        // Cache les resultats
  loader.classList.remove('active');      // Cache le spinner
  fileInput.value = '';                   // Reinitialise l'input fichier
  hideError();
}


// ============================================
// 7. APPEL A L'API (analyse de l'image)
// ============================================

btnAnalyse.addEventListener('click', analyse);

/**
 * Envoie l'image au serveur pour analyse par l'IA Gemini.
 * Affiche les resultats ou une erreur.
 */
async function analyse() {
  if (!base64Image) return;       // Securite : pas d'image = on ne fait rien

  // Prepare l'interface pendant l'attente
  btnAnalyse.disabled = true;
  loader.classList.add('active');  // Affiche le spinner
  results.style.display = 'none';
  hideError();

  try {
    // Envoie l'image au endpoint /analyse (notre API backend)
    const response = await fetch("/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, mediaType })
    });

    // Parse la reponse JSON
    const json = await response.json();

    // Verifie que le serveur a repondu correctement
    if (!response.ok) {
      throw new Error(json.erreur || `Erreur serveur (${response.status})`);
    }

    // Si l'IA n'a pas detecte de nourriture
    if (json.erreur) {
      throw new Error(json.erreur);
    }

    // Affiche les resultats a l'ecran
    displayResults(json);

  } catch (e) {
    showError("Erreur : " + e.message);
  } finally {
    // Dans tous les cas (succes ou erreur) :
    loader.classList.remove('active');   // Cache le spinner
    btnAnalyse.disabled = false;        // Reactive le bouton
  }
}


// ============================================
// 8. AFFICHAGE DES RESULTATS
// ============================================

/**
 * Remplit la section resultats avec les donnees retournees par l'API.
 *
 * @param {Object} d - Les donnees nutritionnelles retournees par Gemini
 */
function displayResults(d) {
  // Remplit les valeurs principales
  document.getElementById('res-total').textContent      = d.total_glucides_g + 'g';
  document.getElementById('res-range').textContent      = `Fourchette estimee : ${d.fourchette_min}g – ${d.fourchette_max}g`;
  document.getElementById('res-calories').textContent   = d.calories_estimees ? d.calories_estimees + ' kcal' : '—';
  document.getElementById('res-glycemique').textContent = d.index_glycemique || '—';
  document.getElementById('res-sucres').textContent     = d.dont_sucres_g != null ? d.dont_sucres_g + 'g' : '—';
  document.getElementById('res-fibres').textContent     = d.fibres_g != null ? d.fibres_g + 'g' : '—';
  document.getElementById('res-conseil').textContent    = d.conseil || '';

  // Construit la liste des aliments identifies
  const list = document.getElementById('foods-list');
  list.innerHTML = '';    // Vide la liste precedente

  (d.aliments || []).forEach((aliment) => {
    const row = document.createElement('div');
    row.className = 'food-row';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'food-name';
    name.textContent = aliment.nom;
    const portion = document.createElement('div');
    portion.style.cssText = "font-family:'DM Mono',monospace;font-size:.7rem;color:var(--muted);margin-top:2px";
    portion.textContent = aliment.portion;
    info.appendChild(name);
    info.appendChild(portion);

    const carbs = document.createElement('div');
    carbs.className = 'food-carbs';
    carbs.textContent = aliment.glucides_g + 'g';

    row.appendChild(info);
    row.appendChild(carbs);
    list.appendChild(row);
  });

  // Affiche la section resultats
  results.style.display = 'block';
}


// ============================================
// 9. GESTION DES ERREURS
// ============================================

/**
 * Affiche un message d'erreur dans la boite rouge.
 * @param {string} msg - Le message d'erreur a afficher
 */
function showError(msg) {
  errorBox.textContent = '\u26A0 ' + msg;
  errorBox.style.display = 'block';
}

/**
 * Cache la boite d'erreur.
 */
function hideError() {
  errorBox.style.display = 'none';
}
