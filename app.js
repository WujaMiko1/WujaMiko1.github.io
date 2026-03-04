/* =====================================================
   WIZYTOWKOSKAN - app.js
   ===================================================== */

// == DOM REFS ==
const loginScreen      = document.getElementById('login-screen');
const appWrapper       = document.getElementById('app');
const loginPasswordEl  = document.getElementById('login-password');
const loginErrorEl     = document.getElementById('login-error');
const btnLogin         = document.getElementById('btn-login');

const settingsPanel    = document.getElementById('settings-panel');
const btnSettings      = document.getElementById('btn-settings');
const btnSync          = document.getElementById('btn-sync');
const btnLogout        = document.getElementById('btn-logout');

const sheetsUrlInput   = document.getElementById('sheets-url');
const syncKeyInput     = document.getElementById('sync-key');
const btnSaveSettings  = document.getElementById('btn-save-settings');

const newPasswordEl    = document.getElementById('new-password');
const confirmPassEl    = document.getElementById('confirm-password');
const btnChangePass    = document.getElementById('btn-change-password');
const passwordStatus   = document.getElementById('password-status');

const fileInput        = document.getElementById('file-input');
const fileInput2       = document.getElementById('file-input-side2');
const previewContainer = document.getElementById('preview-container');
const scanPreview      = document.getElementById('preview-img');
const btnScan          = document.getElementById('btn-scan');
const ocrStatus        = document.getElementById('ocr-status');
const ocrStatusText    = document.getElementById('ocr-status-text');
const rawTextEl        = document.getElementById('raw-ocr-text');

const twoSidedToggle   = document.getElementById('two-sided-toggle');
const sideIndicators   = document.getElementById('side-indicators');
const tabSide1         = document.getElementById('tab-side1');
const tabSide2         = document.getElementById('tab-side2');
const side2Prompt      = document.getElementById('side2-prompt');
const btnSkipSide2     = document.getElementById('btn-skip-side2');

const photo1Preview    = document.getElementById('photo1-preview');
const photo2Preview    = document.getElementById('photo2-preview');
const photo1Wrap       = document.getElementById('photo1-preview-wrap');
const photo2Wrap       = document.getElementById('photo2-preview-wrap');

const dataForm         = document.getElementById('data-form');
const formFields = {
  name:    document.getElementById('f-name'),
  company: document.getElementById('f-company'),
  title:   document.getElementById('f-title'),
  nip:     document.getElementById('f-nip'),
  phone:   document.getElementById('f-phone'),
  email:   document.getElementById('f-email'),
  website: document.getElementById('f-website'),
  address: document.getElementById('f-address'),
  notes:   document.getElementById('f-notes'),
};

const btnSave      = document.getElementById('btn-save-contact');
const btnClear     = document.getElementById('btn-cancel-form');
const searchInput  = document.getElementById('search-input');
const contactsBody = document.getElementById('contacts-tbody');
const btnExport    = document.getElementById('btn-export-csv');
const btnClearAll  = document.getElementById('btn-clear-all');

const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxLabel = document.getElementById('lightbox-label');

const modalOverlay = document.getElementById('modal-overlay');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel  = document.getElementById('modal-cancel');
const modalMessage = document.getElementById('modal-message');

const toastEl = document.getElementById('toast');

// == STATE ==
let contacts        = [];
let editingId       = null;
let currentFile     = null;
let isTwoSided      = false;
let currentSide     = 1;
let side1Data       = null;
let side2Data       = null;
let side1Photo      = null;
let side2Photo      = null;
let pendingDeleteAll = false;
let pendingDeleteId  = null;

// == HELPERS ==
function setOcrStatus(msg) {
  if (ocrStatusText) ocrStatusText.textContent = msg;
  if (ocrStatus) ocrStatus.classList.remove('hidden');
}

function showToast(msg, type) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (type === 'danger' ? ' toast-danger' : '');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add('hidden'), 2800);
}

// == CRYPTO / AUTH ==
const DEFAULT_PASS = 'admin';
const STORAGE_HASH = 'pwHash';
const SESSION_KEY  = 'loggedIn';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function getStoredHash() {
  let h = localStorage.getItem(STORAGE_HASH);
  if (!h) { h = await sha256(DEFAULT_PASS); localStorage.setItem(STORAGE_HASH, h); }
  return h;
}

async function attemptLogin() {
  const pw = loginPasswordEl.value;
  const [hash, stored] = await Promise.all([sha256(pw), getStoredHash()]);
  if (hash === stored) {
    sessionStorage.setItem(SESSION_KEY, '1');
    loginScreen.classList.add('hidden');
    appWrapper.classList.remove('hidden');
    onAppStart();
  } else {
    loginErrorEl.classList.remove('hidden');
    loginPasswordEl.value = '';
    loginPasswordEl.focus();
  }
}

if (btnLogin) btnLogin.addEventListener('click', attemptLogin);
if (loginPasswordEl) loginPasswordEl.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

if (btnLogout) btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  appWrapper.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginPasswordEl.value = '';
  loginErrorEl.classList.add('hidden');
});

if (btnChangePass) btnChangePass.addEventListener('click', async () => {
  const np = newPasswordEl.value.trim();
  const cp = confirmPassEl.value.trim();
  if (!np) { passwordStatus.textContent = 'Wpisz nowe haslo.'; passwordStatus.style.color = 'var(--danger)'; return; }
  if (np !== cp) { passwordStatus.textContent = 'Hasla nie sa zgodne.'; passwordStatus.style.color = 'var(--danger)'; return; }
  if (np.length < 4) { passwordStatus.textContent = 'Min. 4 znaki.'; passwordStatus.style.color = 'var(--danger)'; return; }
  localStorage.setItem(STORAGE_HASH, await sha256(np));
  newPasswordEl.value = ''; confirmPassEl.value = '';
  passwordStatus.textContent = 'Haslo zmienione!';
  passwordStatus.style.color = 'var(--success)';
  setTimeout(() => { passwordStatus.textContent = ''; }, 3000);
});

// == SETTINGS ==
if (btnSettings) btnSettings.addEventListener('click', () => {
  const open = !settingsPanel.classList.contains('hidden');
  settingsPanel.classList.toggle('hidden', open);
  if (!open) {
    sheetsUrlInput.value = localStorage.getItem('sheetsUrl') || '';
    syncKeyInput.value   = localStorage.getItem('syncKey')   || '';
  }
});

if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
  localStorage.setItem('sheetsUrl', sheetsUrlInput.value.trim());
  localStorage.setItem('syncKey',   syncKeyInput.value.trim());
  settingsPanel.classList.add('hidden');
  showToast('Ustawienia zapisane!');
});

// == APP START ==
function onAppStart() {
  contacts = loadContacts();
  renderTable();
  syncFromSheets();
}

window.addEventListener('DOMContentLoaded', async () => {
  await getStoredHash();
  if (sessionStorage.getItem(SESSION_KEY)) {
    loginScreen.classList.add('hidden');
    appWrapper.classList.remove('hidden');
    onAppStart();
  } else {
    loginScreen.classList.remove('hidden');
    appWrapper.classList.add('hidden');
  }
  if (loginPasswordEl) loginPasswordEl.focus();
});

// == IMAGE HELPERS ==
function resizeImageToBase64(file, maxW = 800) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// == IMAGE PREPROCESSING ==
function preprocessImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const SCALE = 0.5;
        const cDet = document.createElement('canvas');
        cDet.width  = Math.round(img.width  * SCALE);
        cDet.height = Math.round(img.height * SCALE);
        const ctxD = cDet.getContext('2d');
        ctxD.drawImage(img, 0, 0, cDet.width, cDet.height);
        const data = ctxD.getImageData(0, 0, cDet.width, cDet.height).data;

        function sampleCorner(cx, cy) {
          let sum = 0, cnt = 0;
          for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const idx = ((cy+dy)*cDet.width+(cx+dx))*4;
            if (idx >= 0 && idx < data.length) { sum += (data[idx]+data[idx+1]+data[idx+2])/3; cnt++; }
          }
          return cnt ? sum/cnt : 255;
        }

        const bgBr = (sampleCorner(5,5)+sampleCorner(cDet.width-6,5)+sampleCorner(5,cDet.height-6)+sampleCorner(cDet.width-6,cDet.height-6))/4;
        const THRESH = 22;
        let minX=cDet.width, maxX=0, minY=cDet.height, maxY=0, foundCard=false;
        for (let y=0;y<cDet.height;y++) for (let x=0;x<cDet.width;x++) {
          const i2=(y*cDet.width+x)*4;
          if (Math.abs((data[i2]+data[i2+1]+data[i2+2])/3-bgBr)>THRESH) {
            if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; foundCard=true;
          }
        }

        let sx=0, sy=0, sw=img.width, sh=img.height;
        if (foundCard) {
          const f=1/SCALE, PAD=8;
          sx=Math.max(0,Math.round((minX-PAD)*f));
          sy=Math.max(0,Math.round((minY-PAD)*f));
          sw=Math.min(img.width, Math.round((maxX-minX+PAD*2)*f));
          sh=Math.min(img.height,Math.round((maxY-minY+PAD*2)*f));
        }

        const MAX_DIM = 2400;
        const UPSCALE = Math.min(2, MAX_DIM / Math.max(sw, sh, 1));
        const cOcr=document.createElement('canvas');
        cOcr.width=Math.round(sw*UPSCALE); cOcr.height=Math.round(sh*UPSCALE);
        const ctxO=cOcr.getContext('2d');
        ctxO.imageSmoothingEnabled=true; ctxO.imageSmoothingQuality='high';
        ctxO.drawImage(img,sx,sy,sw,sh,0,0,cOcr.width,cOcr.height);
        const id2=ctxO.getImageData(0,0,cOcr.width,cOcr.height);
        const d2=id2.data, C=1.6, IC=128*(1-C);
        for (let i=0;i<d2.length;i+=4){
          const g=Math.min(255,Math.max(0,Math.round((d2[i]*.299+d2[i+1]*.587+d2[i+2]*.114)*C+IC)));
          d2[i]=d2[i+1]=d2[i+2]=g;
        }
        ctxO.putImageData(id2,0,0);

        if (scanPreview) {
          const pv=document.createElement('canvas');
          const ms=Math.min(1,400/sw);
          pv.width=Math.round(sw*ms); pv.height=Math.round(sh*ms);
          pv.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,pv.width,pv.height);
          scanPreview.src=pv.toDataURL();
        }

        cOcr.toBlob(blob => resolve(blob), 'image/png');
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// == TWO-SIDED ==
if (twoSidedToggle) twoSidedToggle.addEventListener('change', () => {
  isTwoSided = twoSidedToggle.checked;
  if (sideIndicators) sideIndicators.classList.toggle('hidden', !isTwoSided);
  if (!isTwoSided) {
    side1Data=null; side2Data=null; side1Photo=null; side2Photo=null; currentSide=1;
    if (side2Prompt) side2Prompt.classList.add('hidden');
  }
});

window.switchSideTab = function(n) {
  currentSide = n;
  if (tabSide1) tabSide1.classList.toggle('active', n===1);
  if (tabSide2) tabSide2.classList.toggle('active', n===2);
};

// == FILE INPUT ==
const btnClearImg = document.getElementById('btn-clear-img');
if (btnClearImg) btnClearImg.addEventListener('click', () => {
  currentFile = null;
  if (scanPreview) scanPreview.src = '';
  if (previewContainer) previewContainer.classList.add('hidden');
  if (btnScan) btnScan.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  if (ocrStatus) ocrStatus.classList.add('hidden');
});

if (fileInput) fileInput.addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  currentFile = f;
  if (scanPreview) scanPreview.src = URL.createObjectURL(f);
  if (previewContainer) previewContainer.classList.remove('hidden');
  if (btnScan) btnScan.classList.remove('hidden');
});

if (fileInput2) fileInput2.addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  side2Photo = await resizeImageToBase64(f, 800);
  await runOcrOnFile(f, 2);
  if (side2Prompt) side2Prompt.classList.add('hidden');
  if (tabSide2) tabSide2.classList.add('done');
  mergeAndPopulate();
});

if (btnSkipSide2) btnSkipSide2.addEventListener('click', () => {
  if (side2Prompt) side2Prompt.classList.add('hidden');
  mergeAndPopulate();
});

// == OCR ==
if (btnScan) btnScan.addEventListener('click', async () => {
  if (!currentFile) return;
  await runOcrOnFile(currentFile, currentSide);
});

async function runOcrOnFile(file, side) {
  setOcrStatus('Skanowanie strony ' + side + '...');
  if (btnScan) btnScan.classList.add('hidden');
  try {
    const blob = await preprocessImage(file);
    const result = await Tesseract.recognize(blob, 'pol+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          setOcrStatus('Strona ' + side + ': OCR ' + Math.round(m.progress*100) + '%...');
        }
      }
    });
    const text = result.data.text;
    const parsed = parseBusinessCard(text);
    if (rawTextEl) rawTextEl.textContent = text;
    if (side === 1) {
      side1Data = parsed;
      side1Photo = await resizeImageToBase64(file, 800);
      if (tabSide1) tabSide1.classList.add('done');
      if (isTwoSided) {
        setOcrStatus('Strona 1 gotowa. Teraz zeskanuj strone 2.');
        if (side2Prompt) side2Prompt.classList.remove('hidden');
        switchSideTab(2);
      } else {
        mergeAndPopulate();
      }
    } else {
      side2Data = parsed;
      mergeAndPopulate();
    }
  } catch (err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : String(err);
    setOcrStatus('Blad OCR: ' + msg);
  } finally {
    // In two-sided mode: after scanning side 1, hide scan button (user uses side2 file input)
    const doneWithSide1 = isTwoSided && sideIndicators && !sideIndicators.classList.contains('hidden') && side1Data && !side2Data;
    if (!doneWithSide1) {
      if (btnScan) btnScan.classList.remove('hidden');
    }
  }
}

function mergeAndPopulate() {
  const merged = Object.assign({}, side1Data || {});
  if (side2Data) {
    for (const [k, v] of Object.entries(side2Data)) {
      if (v && !merged[k]) merged[k] = v;
    }
  }
  populateForm(merged);
  if (dataForm) dataForm.classList.remove('hidden');
  setOcrStatus(isTwoSided ? 'Scalono dane z obu stron.' : 'Zeskanowano pola.');
  if (side1Photo && photo1Preview) {
    photo1Preview.src = side1Photo;
    if (photo1Wrap) photo1Wrap.classList.remove('hidden');
    const pp = document.getElementById('photo-previews'); if(pp) pp.classList.remove('hidden');
  }
  if (side2Photo && photo2Preview) {
    photo2Preview.src = side2Photo;
    if (photo2Wrap) photo2Wrap.classList.remove('hidden');
    const pp = document.getElementById('photo-previews'); if(pp) pp.classList.remove('hidden');
  }
}

// == PARSER ==
function fixOcrText(raw) {
  return raw
    .replace(/\[at\]|\(at\)/gi, '@')
    .replace(/\[dot\]|\(dot\)/gi, '.')
    .replace(/[|]/g, '\n');
}

function parseBusinessCard(rawText) {
  const fixed  = fixOcrText(rawText);
  const lines  = fixed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const result = { name:'', company:'', title:'', nip:'', phone:'', email:'', website:'', address:'', notes:'' };
  const used   = new Set();

  // EMAIL
  const em = joined.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (em) {
    result.email = em[0].toLowerCase();
    lines.forEach((l,i) => { if (l.includes(em[0])) used.add(i); });
  }

  // NIP
  const nipM = joined.match(/NIP[\s:.\-]*(\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d)/i);
  if (nipM) {
    result.nip = nipM[1].replace(/[\s\-]/g,'');
    lines.forEach((l,i) => { if (/NIP/i.test(l)) used.add(i); });
  } else {
    for (let i=0; i<lines.length; i++) {
      if (used.has(i)) continue;
      const m = lines[i].match(/^\s*\d{10}\s*$/);
      if (m) { result.nip = m[0].trim(); used.add(i); break; }
    }
  }

  // PHONE
  const phoneP = [
    /(?:\+48[\s\-]?)?\d{3}[\s\-]\d{3}[\s\-]\d{3}/,
    /(?:\+48[\s\-]?)?\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,
    /(?:\+48[\s\-]?)?\d{2}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,
    /\+?48\d{9}/,
    /\d{9}/,
    /\+\d{1,3}[\s\-]\d{2,}[\s\-\d]{4,}/,
  ];
  for (let i=0; i<lines.length && !result.phone; i++) {
    if (used.has(i)) continue;
    const l = lines[i].replace(/tel[\s.:]*|phone[\s.:]*|mob[\s.:]*/gi,'').trim();
    for (const p of phoneP) {
      const m = l.match(p);
      if (m) { result.phone = m[0].replace(/\s+/g,' ').trim(); used.add(i); break; }
    }
  }
  if (!result.phone) {
    for (const p of phoneP) { const m = joined.match(p); if (m) { result.phone = m[0].trim(); break; } }
  }

  // WEBSITE
  const webP = [
    /(?:www\.)[a-zA-Z0-9\-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)*/i,
    /(?:https?:\/\/)[a-zA-Z0-9\-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)*/i,
    /[a-zA-Z0-9\-]{2,}\.(?:pl|com|eu|net|org|io|co)(?:\/[^\s]*){0,2}/i,
  ];
  for (let i=0; i<lines.length && !result.website; i++) {
    if (used.has(i) || lines[i].includes('@')) continue;
    for (const p of webP) {
      const m = lines[i].match(p);
      if (m) { let w = m[0].trim().toLowerCase(); if(!w.startsWith('http')) w='https://'+w; result.website=w; used.add(i); break; }
    }
  }
  if (!result.website) {
    for (const p of webP) {
      const m = joined.match(p);
      if (m && !m[0].includes('@')) { let w=m[0].trim().toLowerCase(); if(!w.startsWith('http'))w='https://'+w; result.website=w; break; }
    }
  }

  // JOB TITLE
  const titleKw = ['prezes','dyrektor','kierownik','manager','specjalista','doradca','konsultant','handlowiec','inzynier','technolog','konstruktor','projektant','analityk','koordynator','asystent','sekretarz','administrator','programista','developer','grafik','architekt','prawnik','ksiegowy','sales','advisor','engineer','designer','consultant','officer','executive','president','vice','head','chief','cto','ceo','coo','cfo','representative','supervisor'];
  for (let i=0; i<lines.length; i++) {
    if (used.has(i)) continue;
    const ll = lines[i].toLowerCase();
    if (titleKw.some(k => ll.includes(k))) { result.title = lines[i]; used.add(i); break; }
  }

  // COMPANY
  const compKw = ['sp. z o.o.','sp.z o.o.','spolka','s.a.','ltd','llc','gmbh','sas','inc','corp','group','holding','solutions','services','systems','technologies','tech','consulting','software','digital','media','studio','agency','center','centre','labs','industries','next','cnc','numerical control','computer'];
  for (let i=0; i<lines.length; i++) {
    if (used.has(i)) continue;
    const ll = lines[i].toLowerCase();
    if (compKw.some(k => ll.includes(k))) { result.company = lines[i]; used.add(i); break; }
  }
  if (!result.company) {
    for (let i=0; i<lines.length; i++) {
      if (used.has(i)) continue;
      const l = lines[i];
      if (l === l.toUpperCase() && l.length >= 3 && l.length <= 40 && /[A-Z]/.test(l)) {
        result.company = l; used.add(i); break;
      }
    }
  }

  // ADDRESS
  const addrKw = ['ul.','ulica','al.','aleja','os.','osiedle','plac','rynek','str.','street','avenue','road','suite','floor'];
  for (let i=0; i<lines.length; i++) {
    if (used.has(i)) continue;
    const ll = lines[i].toLowerCase();
    const isAddr = addrKw.some(k => ll.startsWith(k)) || /\d{2}-\d{3}/.test(lines[i]);
    if (isAddr) {
      result.address = [lines[i], lines[i+1]].filter(Boolean).join(', ');
      used.add(i);
      if (i+1 < lines.length && /\d{2}-\d{3}/.test(lines[i+1])) used.add(i+1);
      break;
    }
  }

  // NAME
  const nameRx = /^[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:[\s\-][A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)+$/;
  for (let i=0; i<lines.length; i++) {
    if (used.has(i)) continue;
    if (nameRx.test(lines[i])) { result.name = lines[i]; used.add(i); break; }
  }
  if (!result.name) {
    for (let i=0; i<lines.length; i++) {
      if (used.has(i)) continue;
      const w = lines[i].split(/\s+/);
      if (w.length === 2 && lines[i] !== lines[i].toUpperCase() && lines[i].length < 50) {
        result.name = lines[i]; used.add(i); break;
      }
    }
  }

  // FALLBACK COMPANY
  if (!result.company) {
    for (let i=0; i<lines.length; i++) {
      if (used.has(i)) continue;
      if (lines[i].length > 2 && lines[i].length < 60) { result.company = lines[i]; used.add(i); break; }
    }
  }

  return result;
}

// == POPULATE FORM ==
function populateForm(data) {
  for (const [k, el] of Object.entries(formFields)) {
    if (!el) continue;
    const v = (data && data[k]) || '';
    el.value = v;
    el.classList.toggle('ocr-filled', !!v);
  }
}

// == CONTACTS STORAGE ==
function loadContacts() {
  try { return JSON.parse(localStorage.getItem('contacts') || '[]'); } catch(e) { return []; }
}
function saveContacts() { localStorage.setItem('contacts', JSON.stringify(contacts)); }

// == SAVE CONTACT ==
if (btnSave) btnSave.addEventListener('click', () => {
  const existing = editingId ? contacts.find(x => x.id === editingId) : null;
  const c = {
    id:      editingId || Date.now().toString(),
    date:    (existing && existing.date) || new Date().toLocaleDateString('pl-PL'),
    name:    formFields.name?.value.trim()    || '',
    company: formFields.company?.value.trim() || '',
    title:   formFields.title?.value.trim()   || '',
    nip:     formFields.nip?.value.trim()     || '',
    phone:   formFields.phone?.value.trim()   || '',
    email:   formFields.email?.value.trim()   || '',
    website: formFields.website?.value.trim() || '',
    address: formFields.address?.value.trim() || '',
    notes:   formFields.notes?.value.trim()   || '',
    photo:   side1Photo  || (existing && existing.photo)  || '',
    photo2:  side2Photo  || (existing && existing.photo2) || '',
  };
  if (editingId) {
    contacts = contacts.map(x => x.id === editingId ? c : x);
    editingId = null;
    if (btnSave) btnSave.textContent = 'Zapisz kontakt';
  } else {
    contacts.unshift(c);
  }
  saveContacts();
  renderTable();
  clearForm();
  showToast('Kontakt zapisany!');
  sendToSheets(c);
});

function clearForm() {
  for (const el of Object.values(formFields)) { if (el) { el.value=''; el.classList.remove('ocr-filled'); } }
  side1Data=null; side2Data=null; side1Photo=null; side2Photo=null;
  if (photo1Wrap) photo1Wrap.classList.add('hidden');
  if (photo2Wrap) photo2Wrap.classList.add('hidden');
  const pp = document.getElementById('photo-previews'); if(pp) pp.classList.add('hidden');
  if (rawTextEl) rawTextEl.textContent = '';
  if (ocrStatus) ocrStatus.classList.add('hidden');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (scanPreview) scanPreview.src = '';
  if (side2Prompt) side2Prompt.classList.add('hidden');
  if (tabSide1) tabSide1.classList.remove('done');
  if (tabSide2) tabSide2.classList.remove('done');
  currentSide = 1; switchSideTab(1);
  if (dataForm) dataForm.classList.add('hidden');
  currentFile = null;
}

if (btnClear) btnClear.addEventListener('click', () => {
  clearForm(); editingId = null;
  if (btnSave) btnSave.textContent = 'Zapisz kontakt';
});

// == RENDER TABLE ==
function renderTable(filter) {
  filter = filter || '';
  const q = filter.toLowerCase();
  const filtered = contacts.filter(c =>
    [c.name,c.company,c.title,c.phone,c.email,c.nip].join(' ').toLowerCase().includes(q)
  );

  const empty = document.getElementById('contacts-empty');
  const tableWrapper = document.getElementById('table-wrapper');
  if (filtered.length === 0) {
    if (empty) empty.style.display = 'flex';
    if (tableWrapper) tableWrapper.classList.add('hidden');
  } else {
    if (empty) empty.style.display = 'none';
    if (tableWrapper) tableWrapper.classList.remove('hidden');
  }

  if (!contactsBody) return;
  contactsBody.innerHTML = '';
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    const thumb = c.photo
      ? `<img src="${esc(c.photo)}" class="contact-thumb" onclick="openLightbox(this.src,'${esc(c.name||'Strona 1')}')" />`
      : `<span class="no-photo">🪪</span>`;
    tr.innerHTML =
      `<td>${thumb}</td>` +
      `<td>${esc(c.name)}</td>` +
      `<td>${esc(c.company)}</td>` +
      `<td>${esc(c.title)}</td>` +
      `<td>${esc(c.nip)}</td>` +
      `<td>${esc(c.phone)}</td>` +
      `<td>${esc(c.email)}</td>` +
      `<td>${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website.replace(/^https?:\/\//,''))}</a>` : ''}</td>` +
      `<td>${esc(c.address)}</td>` +
      `<td>${esc(c.date)}</td>` +
      `<td><button class="btn btn-sm" onclick="editContact('${c.id}')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteContact('${c.id}')">🗑️</button></td>`;
    contactsBody.appendChild(tr);
  });
}

function esc(s) {
  return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
}

// == EDIT / DELETE ==
window.editContact = function(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  for (const [k, el] of Object.entries(formFields)) { if (el) el.value = c[k] || ''; }
  if (c.photo  && photo1Preview) { photo1Preview.src=c.photo;  if(photo1Wrap) photo1Wrap.classList.remove('hidden'); }
  if (c.photo2 && photo2Preview) { photo2Preview.src=c.photo2; if(photo2Wrap) photo2Wrap.classList.remove('hidden'); }
  if (dataForm) { dataForm.classList.remove('hidden'); dataForm.scrollIntoView({behavior:'smooth'}); }
  if (btnSave) btnSave.textContent = 'Aktualizuj kontakt';
};

window.deleteContact = function(id) {
  pendingDeleteId  = id;
  pendingDeleteAll = false;
  if (modalMessage) modalMessage.textContent = 'Czy na pewno chcesz usunac ten kontakt?';
  if (modalOverlay) modalOverlay.classList.remove('hidden');
};

if (modalConfirm) modalConfirm.addEventListener('click', () => {
  if (pendingDeleteAll) {
    contacts = [];
  } else if (pendingDeleteId) {
    contacts = contacts.filter(x => x.id !== pendingDeleteId);
  }
  pendingDeleteId = null; pendingDeleteAll = false;
  saveContacts();
  renderTable(searchInput ? searchInput.value : '');
  if (modalOverlay) modalOverlay.classList.add('hidden');
  showToast('Usunieto.', 'danger');
});

if (modalCancel) modalCancel.addEventListener('click', () => {
  pendingDeleteId = null; pendingDeleteAll = false;
  if (modalOverlay) modalOverlay.classList.add('hidden');
});

if (btnClearAll) btnClearAll.addEventListener('click', () => {
  pendingDeleteAll = true; pendingDeleteId = null;
  if (modalMessage) modalMessage.textContent = 'Czy na pewno chcesz usunac WSZYSTKIE kontakty?';
  if (modalOverlay) modalOverlay.classList.remove('hidden');
});

// == SEARCH ==
if (searchInput) searchInput.addEventListener('input', () => renderTable(searchInput.value));

// == RAW OCR TOGGLE ==
const btnShowRaw = document.getElementById('btn-show-raw');
if (btnShowRaw) btnShowRaw.addEventListener('click', () => {
  if (rawTextEl) rawTextEl.classList.toggle('hidden');
  btnShowRaw.textContent = rawTextEl && rawTextEl.classList.contains('hidden')
    ? 'Pokaz surowy tekst OCR'
    : 'Ukryj surowy tekst';
});

// == EXPORT CSV ==
if (btnExport) btnExport.addEventListener('click', () => {
  const hd = ['Imie i Nazwisko','Firma','Stanowisko','NIP','Telefon','E-mail','WWW','Adres','Notatki','Data'];
  const rows = contacts.map(c =>
    [c.name,c.company,c.title,c.nip,c.phone,c.email,c.website,c.address,c.notes,c.date]
      .map(v => `"${(v||'').replace(/"/g,'""')}"`).join(',')
  );
  const csv = [hd.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download = `wizytowki_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

// == LIGHTBOX ==
window.openLightbox = function(src, label) {
  if (!lightbox) return;
  lightboxImg.src = src;
  if (lightboxLabel) lightboxLabel.textContent = label || '';
  lightbox.classList.remove('hidden');
};
window.closeLightbox = function() {
  if (!lightbox) return;
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
};
if (lightbox) lightbox.addEventListener('click', e => { if(e.target===lightbox) closeLightbox(); });
if (photo1Preview) photo1Preview.addEventListener('click', () => openLightbox(photo1Preview.src, 'Strona 1'));
if (photo2Preview) photo2Preview.addEventListener('click', () => openLightbox(photo2Preview.src, 'Strona 2'));

// == GOOGLE SHEETS SYNC ==
function getSheetsCreds() {
  return { url: localStorage.getItem('sheetsUrl')||'', key: localStorage.getItem('syncKey')||'' };
}

function sendToSheets(c) {
  const { url, key } = getSheetsCreds(); if (!url) return;
  const p = new URLSearchParams({key,id:c.id,date:c.date,name:c.name,company:c.company,title:c.title,nip:c.nip,phone:c.phone,email:c.email,website:c.website,address:c.address,notes:c.notes});
  fetch(url, {method:'POST', body:p, mode:'no-cors'}).catch(e => console.warn('Sheets POST:',e));
}

async function syncFromSheets() {
  const { url, key } = getSheetsCreds(); if (!url || !key) return;
  try {
    const res  = await fetch(`${url}?action=list&key=${encodeURIComponent(key)}`);
    if (!res.ok) return;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return;
    const localById = Object.fromEntries(contacts.map(c => [c.id, c]));
    const merged    = json.map(r => ({...r, photo:(localById[r.id]?.photo||''), photo2:(localById[r.id]?.photo2||'')}));
    const remoteIds = new Set(json.map(c => c.id));
    contacts = [...merged, ...contacts.filter(c => !remoteIds.has(c.id))];
    saveContacts();
    renderTable();
    showToast('Zsynchronizowano ' + merged.length + ' kontaktow.');
  } catch(e) { console.warn('Sync error:',e); }
}

if (btnSync) btnSync.addEventListener('click', async () => {
  btnSync.disabled = true;
  await syncFromSheets();
  btnSync.disabled = false;
});
