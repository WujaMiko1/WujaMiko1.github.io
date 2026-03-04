/* =====================================================
   WIZYTĂ“WKOSKAN â€“ app.js  (full rewrite)
   ===================================================== */

// â”€â”€ DOM REFS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const scanPreview      = document.getElementById('scan-preview');
const btnScan          = document.getElementById('btn-scan');
const ocrStatus        = document.getElementById('ocr-status');
const cropIndicator    = document.getElementById('crop-indicator');
const rawTextEl        = document.getElementById('raw-text');

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
const formFields       = {
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

const btnSave          = document.getElementById('btn-save');
const btnClear         = document.getElementById('btn-clear');

const searchInput      = document.getElementById('search-input');
const contactsBody     = document.getElementById('contacts-body');
const contactCount     = document.getElementById('contact-count');
const btnExport        = document.getElementById('btn-export');

const lightbox         = document.getElementById('lightbox');
const lightboxImg      = document.getElementById('lightbox-img');
const lightboxLabel    = document.getElementById('lightbox-label');

// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let contacts      = [];
let editingId     = null;
let currentFile   = null;
let isTwoSided    = false;
let currentSide   = 1;
let side1Data     = null;
let side2Data     = null;
let side1Photo    = null;
let side2Photo    = null;

// â”€â”€ CRYPTO / AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_PASS   = 'admin';
const STORAGE_HASH   = 'pwHash';
const SESSION_KEY    = 'loggedIn';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
    loginErrorEl.textContent = 'BĹ‚Ä™dne hasĹ‚o. SprĂłbuj ponownie.';
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
  loginErrorEl.textContent  = '';
});

if (btnChangePass) btnChangePass.addEventListener('click', async () => {
  const np = newPasswordEl.value.trim();
  const cp = confirmPassEl.value.trim();
  if (!np) { passwordStatus.textContent = 'Wpisz nowe hasĹ‚o.'; passwordStatus.style.color = 'var(--danger)'; return; }
  if (np !== cp) { passwordStatus.textContent = 'HasĹ‚a nie sÄ… zgodne.'; passwordStatus.style.color = 'var(--danger)'; return; }
  if (np.length < 4) { passwordStatus.textContent = 'Min. 4 znaki.'; passwordStatus.style.color = 'var(--danger)'; return; }
  localStorage.setItem(STORAGE_HASH, await sha256(np));
  newPasswordEl.value = ''; confirmPassEl.value = '';
  passwordStatus.textContent = 'âś“ HasĹ‚o zmienione!';
  passwordStatus.style.color = 'var(--success)';
  setTimeout(() => { passwordStatus.textContent = ''; }, 3000);
});

// â”€â”€ SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (btnSettings) btnSettings.addEventListener('click', () => {
  const open = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = open ? 'none' : 'block';
  if (!open) {
    sheetsUrlInput.value = localStorage.getItem('sheetsUrl') || '';
    syncKeyInput.value   = localStorage.getItem('syncKey')   || '';
  }
});

if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
  localStorage.setItem('sheetsUrl', sheetsUrlInput.value.trim());
  localStorage.setItem('syncKey',   syncKeyInput.value.trim());
  settingsPanel.style.display = 'none';
  showToast('Ustawienia zapisane!');
});

// â”€â”€ TOAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast-msg');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast-msg';
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', left:'50%',
      transform:'translateX(-50%) translateY(100px)',
      padding:'10px 22px', borderRadius:'99px',
      fontWeight:'600', fontSize:'14px', zIndex:'5000',
      transition:'transform .3s', pointerEvents:'none', color:'#fff',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  requestAnimationFrame(() => {
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(100px)'; }, 2800);
  });
}

// â”€â”€ APP START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ IMAGE HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ IMAGE PREPROCESSING (auto-crop + contrast) â”€â”€â”€â”€â”€â”€â”€â”€
function preprocessImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const SCALE = 0.5;
        const cDet = document.createElement('canvas');
        cDet.width = Math.round(img.width * SCALE);
        cDet.height = Math.round(img.height * SCALE);
        const ctxD = cDet.getContext('2d');
        ctxD.drawImage(img, 0, 0, cDet.width, cDet.height);
        const data = ctxD.getImageData(0, 0, cDet.width, cDet.height).data;

        function sampleCorner(cx, cy) {
          let sum = 0, cnt = 0;
          for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const idx = ((cy + dy) * cDet.width + (cx + dx)) * 4;
            if (idx >= 0 && idx < data.length) { sum += (data[idx]+data[idx+1]+data[idx+2])/3; cnt++; }
          }
          return cnt ? sum/cnt : 255;
        }

        const bgBr = (sampleCorner(5,5)+sampleCorner(cDet.width-6,5)+sampleCorner(5,cDet.height-6)+sampleCorner(cDet.width-6,cDet.height-6))/4;
        const THRESH = 22;
        let minX=cDet.width, maxX=0, minY=cDet.height, maxY=0, foundCard=false;
        for (let y=0;y<cDet.height;y++) for (let x=0;x<cDet.width;x++) {
          const idx=(y*cDet.width+x)*4;
          if (Math.abs((data[idx]+data[idx+1]+data[idx+2])/3-bgBr)>THRESH) {
            if (x<minX)minX=x; if (x>maxX)maxX=x;
            if (y<minY)minY=y; if (y>maxY)maxY=y;
            foundCard=true;
          }
        }

        const PAD=8;
        let sx=0,sy=0,sw=img.width,sh=img.height;
        if (foundCard) {
          const f=1/SCALE;
          sx=Math.max(0,Math.round((minX-PAD)*f));
          sy=Math.max(0,Math.round((minY-PAD)*f));
          sw=Math.min(img.width, Math.round((maxX-minX+PAD*2)*f));
          sh=Math.min(img.height,Math.round((maxY-minY+PAD*2)*f));
          if (cropIndicator) { cropIndicator.textContent='âś‚ Auto-kadrowanie'; cropIndicator.style.display='inline-block'; setTimeout(()=>{cropIndicator.style.display='none';},3000); }
        }

        const UPSCALE=4;
        const cOcr=document.createElement('canvas');
        cOcr.width=sw*UPSCALE; cOcr.height=sh*UPSCALE;
        const ctxO=cOcr.getContext('2d');
        ctxO.imageSmoothingEnabled=true; ctxO.imageSmoothingQuality='high';
        ctxO.drawImage(img,sx,sy,sw,sh,0,0,cOcr.width,cOcr.height);
        const id=ctxO.getImageData(0,0,cOcr.width,cOcr.height);
        const d=id.data, C=1.6, IC=128*(1-C);
        for (let i=0;i<d.length;i+=4){
          const g=Math.min(255,Math.max(0,Math.round((d[i]*.299+d[i+1]*.587+d[i+2]*.114)*C+IC)));
          d[i]=d[i+1]=d[i+2]=g;
        }
        ctxO.putImageData(id,0,0);

        if (scanPreview) {
          const pv=document.createElement('canvas'), ms=Math.min(1,400/sw);
          pv.width=Math.round(sw*ms); pv.height=Math.round(sh*ms);
          pv.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,pv.width,pv.height);
          scanPreview.src=pv.toDataURL(); scanPreview.style.display='block';
        }

        cOcr.toBlob(blob => resolve(blob),'image/png');
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// â”€â”€ TWO-SIDED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (twoSidedToggle) twoSidedToggle.addEventListener('change', () => {
  isTwoSided = twoSidedToggle.checked;
  if (sideIndicators) sideIndicators.style.display = isTwoSided ? 'flex' : 'none';
  if (!isTwoSided) { side1Data=null; side2Data=null; side1Photo=null; side2Photo=null; currentSide=1; if(side2Prompt)side2Prompt.style.display='none'; }
});

window.switchSideTab = function(n) {
  currentSide = n;
  if (tabSide1) tabSide1.classList.toggle('active', n===1);
  if (tabSide2) tabSide2.classList.toggle('active', n===2);
};

// â”€â”€ FILE INPUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (fileInput) fileInput.addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  currentFile = f;
  scanPreview.src = URL.createObjectURL(f);
  scanPreview.style.display = 'block';
  if (btnScan) btnScan.disabled = false;
});

if (fileInput2) fileInput2.addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  side2Photo = await resizeImageToBase64(f, 800);
  await runOcrOnFile(f, 2);
  if (side2Prompt) side2Prompt.style.display = 'none';
  if (tabSide2) tabSide2.classList.add('done');
  mergeAndPopulate();
});

if (btnSkipSide2) btnSkipSide2.addEventListener('click', () => {
  if (side2Prompt) side2Prompt.style.display = 'none';
  mergeAndPopulate();
});

// â”€â”€ OCR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (btnScan) btnScan.addEventListener('click', async () => {
  if (!currentFile) return;
  await runOcrOnFile(currentFile, currentSide);
});

async function runOcrOnFile(file, side) {
  if (ocrStatus) { ocrStatus.textContent = `Skanowanie strony ${side}â€¦`; ocrStatus.style.display='block'; }
  if (btnScan) btnScan.disabled = true;
  try {
    const blob = await preprocessImage(file);
    const { data: { text } } = await Tesseract.recognize(blob, 'pol+eng', {
      logger: m => { if (m.status==='recognizing text' && ocrStatus) ocrStatus.textContent=`Strona ${side}: OCR ${Math.round(m.progress*100)}%â€¦`; }
    });
    const parsed = parseBusinessCard(text);
    if (rawTextEl) rawTextEl.value = text;
    if (side === 1) {
      side1Data = parsed;
      side1Photo = await resizeImageToBase64(file, 800);
      if (tabSide1) tabSide1.classList.add('done');
      if (isTwoSided) {
        if (ocrStatus) ocrStatus.textContent = 'Strona 1 gotowa. Teraz zeskanuj stronÄ™ 2.';
        if (side2Prompt) side2Prompt.style.display = 'block';
        switchSideTab(2);
      } else { mergeAndPopulate(); }
    } else {
      side2Data = parsed;
      mergeAndPopulate();
    }
  } catch (err) {
    console.error(err);
    if (ocrStatus) ocrStatus.textContent = 'BĹ‚Ä…d OCR: ' + err.message;
  } finally {
    if (btnScan) btnScan.disabled = false;
  }
}

function mergeAndPopulate() {
  const merged = Object.assign({}, side1Data || {});
  if (side2Data) { for (const [k,v] of Object.entries(side2Data)) { if (v && !merged[k]) merged[k]=v; } }
  populateForm(merged);
  if (dataForm) dataForm.style.display = 'block';
  if (ocrStatus) ocrStatus.textContent = isTwoSided ? 'Scalono dane z obu stron.' : `Zeskanowano pola.`;
  if (side1Photo && photo1Preview) { photo1Preview.src=side1Photo;  if(photo1Wrap)photo1Wrap.classList.remove('hidden'); }
  if (side2Photo && photo2Preview) { photo2Preview.src=side2Photo; if(photo2Wrap)photo2Wrap.classList.remove('hidden'); }
}

// â”€â”€ PARSER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fixOcrText(raw) {
  return raw.replace(/\[at\]|\(at\)|\bat\b/gi,'@').replace(/\[dot\]|\(dot\)/gi,'.').replace(/[\u2022\u2023\u25E6\u2043\u2219|â€˘â—¦â—Ź]/g,'\n');
}

function parseBusinessCard(rawText) {
  const fixed  = fixOcrText(rawText);
  const lines  = fixed.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const result = { name:'', company:'', title:'', nip:'', phone:'', email:'', website:'', address:'', notes:'' };
  const used   = new Set();

  // EMAIL
  const em = joined.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (em) { result.email=em[0].toLowerCase(); lines.forEach((l,i)=>{if(l.includes(em[0]))used.add(i);}); }

  // NIP
  const nipM = joined.match(/NIP[\s:.\-]*(\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d[\s\-]*\d)/i);
  if (nipM) { result.nip=nipM[1].replace(/[\s\-]/g,''); lines.forEach((l,i)=>{if(/NIP/i.test(l))used.add(i);}); }
  else { for (let i=0;i<lines.length;i++) { if(used.has(i))continue; const m=lines[i].match(/^\s*\d{10}\s*$/); if(m){result.nip=m[0].trim();used.add(i);break;} } }

  // PHONE
  const phoneP=[/(?:\+48[\s\-]?)?\d{3}[\s\-]\d{3}[\s\-]\d{3}/,/(?:\+48[\s\-]?)?\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,/(?:\+48[\s\-]?)?\d{2}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,/\+?48\d{9}/,/\d{9}/,/\+\d{1,3}[\s\-]\d{2,}[\s\-\d]{4,}/];
  for (let i=0;i<lines.length&&!result.phone;i++) { if(used.has(i))continue; const l=lines[i].replace(/tel[\s.:]*|phone[\s.:]*|mob[\s.:]*/gi,'').trim(); for(const p of phoneP){const m=l.match(p);if(m){result.phone=m[0].replace(/\s+/g,' ').trim();used.add(i);break;}} }
  if (!result.phone) { for(const p of phoneP){const m=joined.match(p);if(m){result.phone=m[0].trim();break;}} }

  // WEBSITE
  const webP=[/(?:www\.)[a-zA-Z0-9\-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)*/i,/(?:https?:\/\/)[a-zA-Z0-9\-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)*/i,/[a-zA-Z0-9\-]{2,}\.(?:pl|com|eu|net|org|io|co)(?:\/[^\s]*){0,2}/i];
  for (let i=0;i<lines.length&&!result.website;i++) { if(used.has(i)||lines[i].includes('@'))continue; for(const p of webP){const m=lines[i].match(p);if(m){let w=m[0].trim().toLowerCase();if(!w.startsWith('http'))w='https://'+w;result.website=w;used.add(i);break;}} }
  if (!result.website) { for(const p of webP){const m=joined.match(p);if(m&&!m[0].includes('@')){let w=m[0].trim().toLowerCase();if(!w.startsWith('http'))w='https://'+w;result.website=w;break;}} }

  // JOB TITLE
  const titleKw=['prezes','dyrektor','kierownik','manager','specjalista','doradca','konsultant','handlowiec','inĹĽynier','technolog','konstruktor','projektant','analityk','koordynator','asystent','sekretarz','recepcjonista','administrator','programista','developer','grafik','architekt','prawnik','radca','adwokat','accountant','ksiÄ™gowy','sales','advisor','engineer','designer','consultant','officer','executive','president','vice','head','chief','cto','ceo','coo','cfo','representative','supervisor'];
  for (let i=0;i<lines.length;i++) { if(used.has(i))continue; const ll=lines[i].toLowerCase(); if(titleKw.some(k=>ll.includes(k))){result.title=lines[i];used.add(i);break;} }

  // COMPANY
  const compKw=['sp. z o.o.','sp.z o.o.','spĂłĹ‚ka','s.a.','ltd','llc','gmbh','sas','inc','corp','group','holding','solutions','services','systems','technologies','tech','consulting','software','digital','media','studio','agency','center','centre','labs','industries','next','cnc','numerical control','computer'];
  for (let i=0;i<lines.length;i++) { if(used.has(i))continue; const ll=lines[i].toLowerCase(); if(compKw.some(k=>ll.includes(k))){result.company=lines[i];used.add(i);break;} }
  if (!result.company) { for(let i=0;i<lines.length;i++){if(used.has(i))continue;const l=lines[i];if(l===l.toUpperCase()&&l.length>=3&&l.length<=40&&/[A-ZĹ»ĹąÄ†Ä„ĹšÄĹĂ“Ĺ]/.test(l)){result.company=l;used.add(i);break;}} }

  // ADDRESS
  const addrKw=['ul.','ulica','al.','aleja','os.','osiedle','plac','rynek','str.','street','avenue','road','blvd','suite','floor'];
  for (let i=0;i<lines.length;i++) { if(used.has(i))continue; const ll=lines[i].toLowerCase(); if(addrKw.some(k=>ll.startsWith(k))||/\d{2}-\d{3}/.test(lines[i])){result.address=[lines[i],lines[i+1]].filter(Boolean).join(', ');used.add(i);if(i+1<lines.length&&/\d{2}-\d{3}/.test(lines[i+1]))used.add(i+1);break;} }

  // NAME
  const nameRx=/^[A-ZÄ„Ä†ÄĹĹĂ“ĹšĹąĹ»][a-zÄ…Ä‡Ä™Ĺ‚Ĺ„ĂłĹ›ĹşĹĽ]+(?:[\s\-][A-ZÄ„Ä†ÄĹĹĂ“ĹšĹąĹ»][a-zÄ…Ä‡Ä™Ĺ‚Ĺ„ĂłĹ›ĹşĹĽ]+)+$/;
  for (let i=0;i<lines.length;i++) { if(used.has(i))continue; if(nameRx.test(lines[i])){result.name=lines[i];used.add(i);break;} }
  if (!result.name) { for(let i=0;i<lines.length;i++){if(used.has(i))continue;const w=lines[i].split(/\s+/);if(w.length===2&&lines[i]!==lines[i].toUpperCase()&&lines[i].length<50){result.name=lines[i];used.add(i);break;}} }

  // FALLBACK COMPANY
  if (!result.company) { for(let i=0;i<lines.length;i++){if(used.has(i))continue;if(lines[i].length>2&&lines[i].length<60){result.company=lines[i];used.add(i);break;}} }

  return result;
}

// â”€â”€ POPULATE FORM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function populateForm(data) {
  let filled = 0;
  for (const [k, el] of Object.entries(formFields)) {
    if (!el) continue;
    const v = (data && data[k]) || '';
    el.value = v;
    el.classList.toggle('ocr-filled', !!v);
    if (v) filled++;
  }
  const badge = document.getElementById('ocr-badge');
  if (badge) badge.textContent = `${filled}/${Object.keys(formFields).length} pĂłl`;
}

// â”€â”€ CONTACTS STORAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadContacts() {
  try { return JSON.parse(localStorage.getItem('contacts') || '[]'); } catch { return []; }
}
function saveContacts() { localStorage.setItem('contacts', JSON.stringify(contacts)); }

// â”€â”€ SAVE CONTACT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (btnSave) btnSave.addEventListener('click', () => {
  const existing = editingId ? contacts.find(x => x.id === editingId) : null;
  const c = {
    id:      editingId || Date.now().toString(),
    date:    editingId ? (existing?.date || new Date().toLocaleDateString('pl-PL')) : new Date().toLocaleDateString('pl-PL'),
    name:    formFields.name?.value.trim()    || '',
    company: formFields.company?.value.trim() || '',
    title:   formFields.title?.value.trim()   || '',
    nip:     formFields.nip?.value.trim()     || '',
    phone:   formFields.phone?.value.trim()   || '',
    email:   formFields.email?.value.trim()   || '',
    website: formFields.website?.value.trim() || '',
    address: formFields.address?.value.trim() || '',
    notes:   formFields.notes?.value.trim()   || '',
    photo:   side1Photo  || existing?.photo  || '',
    photo2:  side2Photo  || existing?.photo2 || '',
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
  if (rawTextEl) rawTextEl.value='';
  if (ocrStatus) ocrStatus.style.display='none';
  if (scanPreview) { scanPreview.src=''; scanPreview.style.display='none'; }
  if (side2Prompt) side2Prompt.style.display='none';
  if (tabSide1) tabSide1.classList.remove('done');
  if (tabSide2) tabSide2.classList.remove('done');
  currentSide=1; switchSideTab(1);
  if (dataForm) dataForm.style.display='none';
  currentFile=null;
}

if (btnClear) btnClear.addEventListener('click', () => { clearForm(); editingId=null; if(btnSave)btnSave.textContent='Zapisz kontakt'; });

// â”€â”€ RENDER TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderTable(filter = '') {
  const q = (filter||'').toLowerCase();
  const filtered = contacts.filter(c => [c.name,c.company,c.title,c.phone,c.email,c.nip].join(' ').toLowerCase().includes(q));
  if (contactCount) contactCount.textContent = `(${filtered.length})`;
  if (!contactsBody) return;
  contactsBody.innerHTML = '';
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    const thumb = c.photo
      ? `<img src="${esc(c.photo)}" class="contact-thumb" onclick="openLightbox(this.src,'${esc(c.name||'Strona 1')}')" />`
      : `<span class="no-photo">đźŞŞ</span>`;
    tr.innerHTML = `
      <td>${thumb}</td>
      <td>${esc(c.name)}</td>
      <td>${esc(c.company)}</td>
      <td>${esc(c.title)}</td>
      <td>${esc(c.nip)}</td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.email)}</td>
      <td>${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website.replace(/^https?:\/\//,''))}</a>` : ''}</td>
      <td>${esc(c.address)}</td>
      <td>${esc(c.date)}</td>
      <td>
        <button class="btn btn-sm" onclick="editContact('${c.id}')">âśŹď¸Ź</button>
        <button class="btn btn-sm btn-danger" onclick="deleteContact('${c.id}')">đź—‘ď¸Ź</button>
      </td>`;
    contactsBody.appendChild(tr);
  });
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

// â”€â”€ EDIT / DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.editContact = function(id) {
  const c = contacts.find(x => x.id === id); if (!c) return;
  editingId = id;
  for (const [k, el] of Object.entries(formFields)) { if (el) el.value = c[k] || ''; }
  if (c.photo  && photo1Preview) { photo1Preview.src=c.photo;  if(photo1Wrap)photo1Wrap.classList.remove('hidden'); }
  if (c.photo2 && photo2Preview) { photo2Preview.src=c.photo2; if(photo2Wrap)photo2Wrap.classList.remove('hidden'); }
  if (dataForm) dataForm.style.display='block';
  if (btnSave)  btnSave.textContent='Aktualizuj kontakt';
  dataForm.scrollIntoView({behavior:'smooth'});
};

window.deleteContact = function(id) {
  if (!confirm('UsunÄ…Ä‡ ten kontakt?')) return;
  contacts = contacts.filter(x => x.id !== id);
  saveContacts();
  renderTable(searchInput?.value || '');
  showToast('Kontakt usuniÄ™ty.','danger');
};

// â”€â”€ SEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (searchInput) searchInput.addEventListener('input', () => renderTable(searchInput.value));

// â”€â”€ EXPORT CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (btnExport) btnExport.addEventListener('click', () => {
  const hd = ['ImiÄ™ i Nazwisko','Firma','Stanowisko','NIP','Telefon','E-mail','WWW','Adres','Notatki','Data'];
  const rows = contacts.map(c => [c.name,c.company,c.title,c.nip,c.phone,c.email,c.website,c.address,c.notes,c.date].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','));
  const csv  = [hd.join(','), ...rows].join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download = `wizytowki_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

// â”€â”€ LIGHTBOX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
if (lightbox)      lightbox.addEventListener('click', e => { if (e.target===lightbox) closeLightbox(); });
if (photo1Preview) photo1Preview.addEventListener('click', () => openLightbox(photo1Preview.src,'Strona 1'));
if (photo2Preview) photo2Preview.addEventListener('click', () => openLightbox(photo2Preview.src,'Strona 2'));

// â”€â”€ GOOGLE SHEETS SYNC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getSheetsCreds() { return { url: localStorage.getItem('sheetsUrl')||'', key: localStorage.getItem('syncKey')||'' }; }

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
    const localById = Object.fromEntries(contacts.map(c=>[c.id,c]));
    const merged    = json.map(r => ({...r, photo: localById[r.id]?.photo||'', photo2: localById[r.id]?.photo2||''}));
    const remoteIds = new Set(json.map(c=>c.id));
    contacts = [...merged, ...contacts.filter(c=>!remoteIds.has(c.id))];
    saveContacts();
    renderTable();
    showToast(`Zsynchronizowano ${merged.length} kontaktĂłw.`);
  } catch (e) { console.warn('Sync error:',e); }
}

if (btnSync) btnSync.addEventListener('click', async () => {
  btnSync.disabled = true;
  await syncFromSheets();
  btnSync.disabled = false;
});
