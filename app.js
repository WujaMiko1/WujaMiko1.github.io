/* =========================================
   SKANER WIZYTÓWEK - LOGIKA APLIKACJI
   ========================================= */

'use strict';

// ---- STATE ----
let currentImageFile = null;
let contacts = [];
let pendingDeleteId = null;
let filteredContacts = [];

// ---- DOM REFERENCES ----
const fileInput        = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImg       = document.getElementById('preview-img');
const btnClearImg      = document.getElementById('btn-clear-img');
const btnScan          = document.getElementById('btn-scan');
const ocrStatus        = document.getElementById('ocr-status');
const progressFill     = document.getElementById('progress-fill');
const ocrStatusText    = document.getElementById('ocr-status-text');
const dataForm         = document.getElementById('data-form');
const rawOcrText       = document.getElementById('raw-ocr-text');
const btnShowRaw       = document.getElementById('btn-show-raw');
const contactsTbody    = document.getElementById('contacts-tbody');
const contactsEmpty    = document.getElementById('contacts-empty');
const tableWrapper     = document.getElementById('table-wrapper');
const searchInput      = document.getElementById('search-input');
const settingsPanel    = document.getElementById('settings-panel');
const btnSettings      = document.getElementById('btn-settings');
const btnSaveSettings  = document.getElementById('btn-save-settings');
const btnTestConn      = document.getElementById('btn-test-connection');
const sheetsUrl        = document.getElementById('sheets-url');
const connStatus       = document.getElementById('connection-status');
const saveStatus       = document.getElementById('save-status');
const toast            = document.getElementById('toast');
const modalOverlay     = document.getElementById('modal-overlay');
const modalConfirm     = document.getElementById('modal-confirm');
const modalCancel      = document.getElementById('modal-cancel');
const modalMessage     = document.getElementById('modal-message');

// Form fields
const fName    = document.getElementById('f-name');
const fCompany = document.getElementById('f-company');
const fTitle   = document.getElementById('f-title');
const fPhone   = document.getElementById('f-phone');
const fEmail   = document.getElementById('f-email');
const fWebsite = document.getElementById('f-website');
const fAddress = document.getElementById('f-address');
const fNotes   = document.getElementById('f-notes');

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadContacts();
  renderTable();
  bindEvents();
  registerSW();
});

// ---- SERVICE WORKER ----
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ---- SETTINGS ----
function loadSettings() {
  sheetsUrl.value = localStorage.getItem('sheetsUrl') || '';
}

btnSettings.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

btnSaveSettings.addEventListener('click', () => {
  const url = sheetsUrl.value.trim();
  localStorage.setItem('sheetsUrl', url);
  showToast('✅ Ustawienia zapisane!', 'success');
  connStatus.textContent = '';
});

btnTestConn.addEventListener('click', async () => {
  const url = sheetsUrl.value.trim();
  if (!url) {
    setStatus(connStatus, '⚠️ Podaj URL Apps Script.', 'error');
    return;
  }
  setStatus(connStatus, '🔄 Testowanie połączenia...', 'info');
  try {
    await sendToSheets({ name: 'TEST', company: 'TEST', _test: true }, url);
    setStatus(connStatus, '✅ Połączenie działa! Dane trafią do Sheets.', 'success');
  } catch (e) {
    setStatus(connStatus, '✅ Żądanie wysłane (no-cors). Sprawdź arkusz czy pojawił się wiersz TEST.', 'success');
  }
});

// ---- FILE INPUT ----
function bindEvents() {
  fileInput.addEventListener('change', handleFileSelect);
  btnClearImg.addEventListener('click', clearImage);
  btnScan.addEventListener('click', runOCR);
  btnShowRaw.addEventListener('click', toggleRawOcr);
  document.getElementById('btn-save-contact').addEventListener('click', saveContact);
  document.getElementById('btn-cancel-form').addEventListener('click', cancelForm);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-clear-all').addEventListener('click', confirmClearAll);
  searchInput.addEventListener('input', handleSearch);
  modalConfirm.addEventListener('click', executeDelete);
  modalCancel.addEventListener('click', closeModal);

  // Drag & drop on desktop
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  });
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadImage(file);
}

function loadImage(file) {
  currentImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewContainer.classList.remove('hidden');
    document.getElementById('drop-zone').classList.add('hidden');
    btnScan.classList.remove('hidden');
    dataForm.classList.add('hidden');
    ocrStatus.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  currentImageFile = null;
  previewImg.src = '';
  previewContainer.classList.add('hidden');
  document.getElementById('drop-zone').classList.remove('hidden');
  btnScan.classList.add('hidden');
  ocrStatus.classList.add('hidden');
  dataForm.classList.add('hidden');
  fileInput.value = '';
}

// ---- SMART CARD DETECTION + CROP + PRE-PROCESS ----
function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // --- Step 1: sample-based card detection on small thumbnail ---
      const THUMB = 300; // work on 300px wide thumbnail for speed
      const thumbScale = THUMB / img.width;
      const thumbW = THUMB;
      const thumbH = Math.round(img.height * thumbScale);

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width  = thumbW;
      thumbCanvas.height = thumbH;
      const tCtx = thumbCanvas.getContext('2d');
      tCtx.drawImage(img, 0, 0, thumbW, thumbH);
      const thumbData = tCtx.getImageData(0, 0, thumbW, thumbH).data;

      // Sample 4 corners (10x10 px each) to estimate background brightness
      function sampleBrightness(x, y, size) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < size; dy++) {
          for (let dx = 0; dx < size; dx++) {
            const px = ((y + dy) * thumbW + (x + dx)) * 4;
            sum += 0.299 * thumbData[px] + 0.587 * thumbData[px+1] + 0.114 * thumbData[px+2];
            count++;
          }
        }
        return sum / count;
      }

      const CORNER = 6;
      const bgBrightness = (
        sampleBrightness(0, 0, CORNER) +
        sampleBrightness(thumbW - CORNER, 0, CORNER) +
        sampleBrightness(0, thumbH - CORNER, CORNER) +
        sampleBrightness(thumbW - CORNER, thumbH - CORNER, CORNER)
      ) / 4;

      // The card should be significantly different from background
      // Threshold: pixel is "card" if its brightness differs from bg by > 20
      const THRESHOLD = 22;
      function isCard(px) {
        const gray = 0.299 * thumbData[px] + 0.587 * thumbData[px+1] + 0.114 * thumbData[px+2];
        return Math.abs(gray - bgBrightness) > THRESHOLD;
      }

      // --- Step 2: find bounding box of card pixels ---
      let minX = thumbW, maxX = 0, minY = thumbH, maxY = 0;
      for (let y = 0; y < thumbH; y++) {
        for (let x = 0; x < thumbW; x++) {
          const px = (y * thumbW + x) * 4;
          if (isCard(px)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Validate crop (must be at least 20% of image)
      const cropW = maxX - minX;
      const cropH = maxY - minY;
      const didCrop = cropW > thumbW * 0.2 && cropH > thumbH * 0.2 &&
                      (minX > CORNER || minY > CORNER || maxX < thumbW - CORNER || maxY < thumbH - CORNER);

      // Scale crop coords back to original image
      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
      if (didCrop) {
        const PAD = 8; // padding in thumbnail pixels
        srcX = Math.max(0, Math.round((minX - PAD) / thumbScale));
        srcY = Math.max(0, Math.round((minY - PAD) / thumbScale));
        srcW = Math.min(img.width  - srcX, Math.round((cropW + PAD * 2) / thumbScale));
        srcH = Math.min(img.height - srcY, Math.round((cropH + PAD * 2) / thumbScale));

        // Update preview to show cropped image
        const prevCanvas = document.createElement('canvas');
        prevCanvas.width  = srcW;
        prevCanvas.height = srcH;
        prevCanvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        previewImg.src = prevCanvas.toDataURL();

        // Show crop indicator
        let indicator = document.getElementById('crop-indicator');
        if (!indicator) {
          indicator = document.createElement('span');
          indicator.id = 'crop-indicator';
          previewContainer.insertBefore(indicator, previewContainer.querySelector('button'));
        }
        indicator.textContent = '✂️ Wizytówka auto-przycinana';
      } else {
        const indicator = document.getElementById('crop-indicator');
        if (indicator) indicator.remove();
      }

      // --- Step 3: render cropped area to final canvas with upscale + contrast ---
      const TARGET_W = 1600;
      const scale = Math.max(1, Math.min(4, TARGET_W / srcW));
      const finalW = Math.round(srcW * scale);
      const finalH = Math.round(srcH * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');

      // Draw cropped & scaled image
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, finalW, finalH);

      // Grayscale + contrast boost
      const imageData = ctx.getImageData(0, 0, finalW, finalH);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        const contrast = 1.5;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        d[i] = d[i+1] = d[i+2] = adjusted;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(blob => resolve(blob), 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
}

// ---- OCR ----
async function runOCR() {
  if (!currentImageFile) return;

  btnScan.disabled = true;
  ocrStatus.classList.remove('hidden');
  dataForm.classList.add('hidden');
  setProgress(0, 'Przetwarzanie obrazu...');

  try {
    // Pre-process image for better OCR
    setProgress(10, 'Poprawa kontrastu obrazu...');
    const processedBlob = await preprocessImage(currentImageFile);

    setProgress(20, 'Ładowanie silnika OCR...');
    const worker = await Tesseract.createWorker(['pol', 'eng'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setProgress(50 + Math.round(m.progress * 45), `Rozpoznawanie tekstu... ${50 + Math.round(m.progress * 45)}%`);
        } else if (m.status === 'loading language traineddata') {
          setProgress(25, 'Ładowanie danych językowych...');
        } else if (m.status === 'initializing api') {
          setProgress(40, 'Inicjalizacja OCR...');
        }
      }
    });

    // Configure for business cards
    await worker.setParameters({
      tessedit_pageseg_mode: '6', // Assume uniform block of text
    });

    setProgress(50, 'Analiza obrazu...');
    const { data: { text } } = await worker.recognize(processedBlob);
    await worker.terminate();

    setProgress(100, 'Gotowe!');
    setTimeout(() => ocrStatus.classList.add('hidden'), 500);

    const parsed = parseBusinessCard(text);
    populateForm(parsed, text);
    dataForm.classList.remove('hidden');
    dataForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error(err);
    setProgress(0, '❌ Błąd OCR. Spróbuj ponownie.');
    showToast('❌ Błąd skanowania. Spróbuj z lepszym zdjęciem.', 'error');
  }

  btnScan.disabled = false;
}

function setProgress(pct, text) {
  progressFill.style.width = pct + '%';
  ocrStatusText.textContent = text;
}

// ---- PARSER ----

// Pre-process raw OCR text to fix common mistakes
function fixOcrText(raw) {
  return raw
    // Fix @-sign alternatives (OCR often misreads @)
    .replace(/\[at\]/gi, '@')
    .replace(/\(at\)/gi, '@')
    .replace(/\[At\]/gi, '@')
    .replace(/ at ([a-z])/gi, '@$1')
    // Fix broken phone separators
    .replace(/(\d)\s*[—–−]\s*(\d)/g, '$1-$2')
    // Fix extra spaces in emails
    .replace(/([a-z0-9._%+\-]+)\s*@\s*([a-z0-9.\-]+\.[a-z]{2,})/gi, '$1@$2')
    // Common OCR digit/letter swaps in words (only outside emails/phones)
    .replace(/(?<![a-z0-9@])0(?=[a-z])/gi, 'O')  // 0raz → Oraz (very conservative)
    .trim();
}

function parseBusinessCard(rawText) {
  const fixed = fixOcrText(rawText);

  // Lines: cleaned, non-empty (min 2 chars)
  const lines = fixed
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const result = { name: '', company: '', title: '', phone: '', email: '', website: '', address: '' };
  const used = new Set();

  // ================================================================
  // 1. EMAIL — search full joined text (catches split-line emails)
  // ================================================================
  const joinedText = lines.join(' ');
  const emailMatch = joinedText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase();
    // Mark the line(s) containing @ as used
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@')) { used.add(i); break; }
    }
  }

  // ================================================================
  // 2. PHONE — multiple Polish/international patterns
  // ================================================================
  const PHONE_PATTERNS = [
    // +48 mobile/landline
    /(?:\+48|0048)[\s.\-]?(?:\d[\s.\-]?){9}/,
    // 9-digit Polish mobile: 123 456 789 or 123-456-789
    /(?<!\d)\d{3}[\s.\-]\d{3}[\s.\-]\d{3}(?!\d)/,
    // Polish landline: 12 345 67 89
    /(?<!\d)\d{2}[\s.\-]\d{3}[\s.\-]\d{2}[\s.\-]\d{2}(?!\d)/,
    // 9 digits no separator
    /(?<!\d)\d{9}(?!\d)/,
    // International: +XX XXX XXX XXX
    /\+\d{1,3}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}/,
    // Generic: mostly digits, some separators
    /(?<!\d)[\d]{2,4}[\s.\-][\d]{2,4}[\s.\-][\d]{2,4}(?!\d)/,
  ];

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const line = lines[i];
    for (const pat of PHONE_PATTERNS) {
      const m = line.match(pat);
      if (m) {
        const digits = m[0].replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15) {
          result.phone = m[0].trim();
          used.add(i);
          break;
        }
      }
    }
    if (result.phone) break;
  }

  // Fallback: line is 7-15 digits (+separators), nothing else significant
  if (!result.phone) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const stripped = lines[i].replace(/[\s\-+().]/g, '');
      if (/^\d{7,15}$/.test(stripped)) {
        result.phone = lines[i].trim();
        used.add(i);
        break;
      }
    }
  }

  // ================================================================
  // 3. WEBSITE — various formats
  // ================================================================
  const WEB_PATTERNS = [
    /https?:\/\/[\w\-]+(?:\.[\w\-]+)+(?:\/[^\s,;]*)*/i,
    /www\.[\w\-]+(?:\.[\w\-]+)+(?:\/[^\s,;]*)*/i,
    /[\w\-]{2,}\.(?:pl|com|net|org|eu|io|biz|info|co\.uk|com\.pl)(?:\/[^\s,;]*)*/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    for (const pat of WEB_PATTERNS) {
      const m = lines[i].match(pat);
      if (m) {
        const candidate = m[0].replace(/[.,;]+$/, '');
        // Not an email, must contain a dot
        if (!candidate.includes('@') && candidate.includes('.') && candidate.length > 4) {
          result.website = candidate;
          used.add(i);
          break;
        }
      }
    }
    if (result.website) break;
  }

  // ================================================================
  // 4. JOB TITLE — keyword-based
  // ================================================================
  const JOB_KW = [
    // Polish
    'dyrektor', 'kierownik', 'prezes', 'wiceprezes', 'właściciel', 'współwłaściciel',
    'specjalista', 'starszy specjalista', 'główny specjalista',
    'koordynator', 'asystent', 'asystentka', 'sekretarz', 'sekretarka',
    'konsultant', 'doradca', 'analityk', 'administrator',
    'programista', 'inżynier', 'projektant', 'grafik',
    'handlowiec', 'przedstawiciel handlowy', 'przedstawiciel', 'agent', 'broker', 'pośrednik',
    'księgowy', 'księgowa', 'prawnik', 'adwokat', 'radca', 'notariusz',
    'lekarz', 'pielęgniarka', 'farmaceuta', 'nauczyciel', 'wykładowca',
    'szef', 'naczelnik', 'kierowca', 'operator', 'technik', 'montażysta',
    'architekt', 'geodeta', 'rzeczoznawca', 'biegły',
    'dr ', 'dr.', 'prof.', 'prof ', 'mgr ', 'mgr.', 'inż.', 'lic.',
    // English
    'ceo', 'cto', 'cfo', 'coo', 'cmo', 'vp ', 'vice president',
    'director', 'manager', 'president', 'founder', 'partner', 'officer',
    'executive', 'supervisor', 'engineer', 'developer', 'designer',
    'analyst', 'consultant', 'specialist', 'coordinator', 'assistant',
    'sales', 'accountant', 'attorney', 'lawyer', 'head of', 'lead ',
    'senior ', 'junior ', 'intern',
  ];

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const lower = lines[i].toLowerCase();
    if (JOB_KW.some(kw => lower.includes(kw))) {
      result.title = lines[i].trim();
      used.add(i);
      break;
    }
  }

  // ================================================================
  // 5. COMPANY — legal suffixes + ALL-CAPS heuristic
  // ================================================================
  const CO_KW = [
    // Polish legal forms
    'sp. z o.o', 'sp.z o.o', 'sp. z o.o.', 'spółka z o.o', 'spółka akcyjna',
    's.a.', ' s.a,', 's.c.', 's.j.', 's.k.', 's.k.a.', ' sp.k', 'spzoo',
    // International
    ' ltd', ' limited', ' gmbh', ' ag,', ' ag ', ' inc.', ' inc,', ' corp.', ' corp,',
    ' llc', ' llp', ' bv ', ' nv ',
    // Generic business words
    'group', 'holding', 'studio', 'agencja', 'agency', 'instytut', 'institute',
    'fundacja', 'foundation', 'solutions', 'technologies', 'technology',
    'systems', 'services', 'consulting', 'ventures', 'investments', 'capital',
    'logistics', 'logistyka', 'transport', 'budownictwo', 'nieruchomości',
    'architektura', 'marketing', 'media', 'print', 'drukarnia', 'sklep',
    'hotel', 'restaurant', 'restauracja', 'clinic', 'klinika', 'szpital',
  ];

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const lower = lines[i].toLowerCase();
    if (CO_KW.some(kw => lower.includes(kw))) {
      result.company = lines[i].trim();
      used.add(i);
      break;
    }
  }

  // ALL-CAPS heuristic: company names are often all uppercase
  if (!result.company) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const line = lines[i];
      if (line.length < 2) continue;
      const letters = line.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
      if (letters.length < 2) continue;
      const upperCount = (line.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) || []).length;
      // More than 75% uppercase letters → likely a company name
      if (upperCount / letters.length > 0.75 && line.length >= 3) {
        result.company = line.trim();
        used.add(i);
        break;
      }
    }
  }

  // ================================================================
  // 6. ADDRESS
  // ================================================================
  const ADDR_PAT = [
    /(?:ul\.|al\.|os\.|pl\.|aleja|ulica|osiedle|plac)\s+\S/i,
    /\d{2}[-–]\d{3}\s+\w+/,       // Polish postal code: 00-000 Warszawa
    /(?:street|avenue|road|drive|lane|blvd|st\.|ave\.)\b/i,
    /\bul\b|\bal\b|\bos\b/i,      // abbreviated
  ];
  const addrLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    if (ADDR_PAT.some(p => p.test(lines[i]))) {
      addrLines.push(lines[i]);
      used.add(i);
    }
  }
  if (addrLines.length) result.address = addrLines.join(', ');

  // ================================================================
  // 7. NAME — 2-4 words, each starts uppercase, only letters/hyphens
  // ================================================================
  const PL_UPPER  = /^[A-ZŁŚŻŹĆĄĘÓŃ]/;
  const NAME_WORD = /^[A-Za-złśżźćąęóńŁŚŻŹĆĄĘÓŃ](?:[A-Za-złśżźćąęóńŁŚŻŹĆĄĘÓŃ]+)?(?:-[A-Za-złśżźćąęóńŁŚŻŹĆĄĘÓŃ]+)?$/;

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const words = lines[i].trim().split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    if (/\d/.test(lines[i])) continue;  // names don't have digits
    const allValid = words.every(w => NAME_WORD.test(w));
    const capitalCount = words.filter(w => PL_UPPER.test(w)).length;
    if (allValid && capitalCount >= 2) {
      result.name = lines[i].trim();
      used.add(i);
      break;
    }
  }

  // Fallback name: 2+ words, no digits, most start with uppercase
  if (!result.name) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      if (/\d/.test(lines[i])) continue;
      const words = lines[i].trim().split(/\s+/);
      if (words.length < 2 || words.length > 5) continue;
      const capWords = words.filter(w => PL_UPPER.test(w) && w.length > 1);
      if (capWords.length >= 2) {
        result.name = lines[i].trim();
        used.add(i);
        break;
      }
    }
  }

  // ================================================================
  // 8. FALLBACK COMPANY (if still nothing found)
  // ================================================================
  if (!result.company) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      if (lines[i].length > 2 && !/^\d+$/.test(lines[i])) {
        result.company = lines[i].trim();
        used.add(i);
        break;
      }
    }
  }

  return result;
}

// ---- FORM ----
function populateForm(data, rawText) {
  // Fill fields and mark auto-filled ones with highlight class
  function fill(el, val) {
    el.value = val || '';
    el.classList.toggle('ocr-filled', !!val);
    // Remove highlight on manual edit
    el.addEventListener('input', () => el.classList.remove('ocr-filled'), { once: true });
  }

  fill(fName,    data.name);
  fill(fCompany, data.company);
  fill(fTitle,   data.title);
  fill(fPhone,   data.phone);
  fill(fEmail,   data.email);
  fill(fWebsite, data.website);
  fill(fAddress, data.address);
  fNotes.value = '';
  fNotes.classList.remove('ocr-filled');

  rawOcrText.textContent = rawText || '';
  rawOcrText.classList.add('hidden');
  btnShowRaw.textContent = '👁 Pokaż surowy tekst OCR';
  saveStatus.textContent = '';

  // Summary badge: how many fields filled
  const filled = [data.name, data.company, data.title, data.phone, data.email, data.website, data.address]
    .filter(Boolean).length;
  const h2 = dataForm.querySelector('h2');
  const badge = dataForm.querySelector('.ocr-badge') || document.createElement('span');
  badge.className = 'ocr-badge';
  badge.style.cssText = 'margin-left:10px;background:rgba(59,130,246,.2);color:#60a5fa;border:1px solid rgba(59,130,246,.3);border-radius:99px;padding:2px 10px;font-size:13px;font-weight:600;vertical-align:middle;';
  badge.textContent = `${filled}/7 pól`;
  if (!dataForm.querySelector('.ocr-badge')) h2.appendChild(badge);
  else badge.textContent = `${filled}/7 pól`;
}

function cancelForm() {
  dataForm.classList.add('hidden');
  clearImage();
}

function toggleRawOcr() {
  const hidden = rawOcrText.classList.toggle('hidden');
  btnShowRaw.textContent = hidden ? '👁 Pokaż surowy tekst OCR' : '🙈 Ukryj surowy tekst';
}

// ---- SAVE CONTACT ----
async function saveContact() {
  const contact = {
    id: Date.now(),
    date: new Date().toLocaleDateString('pl-PL'),
    name:    fName.value.trim(),
    company: fCompany.value.trim(),
    title:   fTitle.value.trim(),
    phone:   fPhone.value.trim(),
    email:   fEmail.value.trim(),
    website: fWebsite.value.trim(),
    address: fAddress.value.trim(),
    notes:   fNotes.value.trim()
  };

  if (!contact.name && !contact.company && !contact.email && !contact.phone) {
    setStatus(saveStatus, '⚠️ Wypełnij przynajmniej jedno pole.', 'error');
    return;
  }

  // Save to localStorage
  contacts.unshift(contact);
  persistContacts();
  renderTable();

  // Send to Google Sheets
  const url = localStorage.getItem('sheetsUrl');
  if (url) {
    setStatus(saveStatus, '🔄 Wysyłanie do Google Sheets...', 'info');
    try {
      await sendToSheets(contact, url);
      setStatus(saveStatus, '✅ Zapisano lokalnie i w Google Sheets!', 'success');
    } catch (e) {
      setStatus(saveStatus, '⚠️ Zapisano lokalnie. Sheets może nie działać – sprawdź URL.', 'error');
    }
  } else {
    setStatus(saveStatus, '✅ Zapisano lokalnie. Skonfiguruj Google Sheets w ustawieniach.', 'success');
  }

  showToast('✅ Kontakt zapisany!', 'success');

  setTimeout(() => {
    dataForm.classList.add('hidden');
    clearImage();
    document.getElementById('contacts-section').scrollIntoView({ behavior: 'smooth' });
  }, 1200);
}

// ---- GOOGLE SHEETS ----
async function sendToSheets(contact, url) {
  // Using no-cors mode to avoid CORS issues with Apps Script
  // Data is sent as URL-encoded form data
  const params = new URLSearchParams({
    date:    contact.date    || new Date().toLocaleDateString('pl-PL'),
    name:    contact.name    || '',
    company: contact.company || '',
    title:   contact.title   || '',
    phone:   contact.phone   || '',
    email:   contact.email   || '',
    website: contact.website || '',
    address: contact.address || '',
    notes:   contact.notes   || ''
  });

  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
}

// ---- LOCAL STORAGE ----
function persistContacts() {
  localStorage.setItem('contacts', JSON.stringify(contacts));
}

function loadContacts() {
  const stored = localStorage.getItem('contacts');
  contacts = stored ? JSON.parse(stored) : [];
  filteredContacts = [...contacts];
}

// ---- TABLE ----
function renderTable(list) {
  const data = list !== undefined ? list : contacts;
  filteredContacts = data;

  if (data.length === 0) {
    contactsEmpty.classList.remove('hidden');
    tableWrapper.classList.add('hidden');
    return;
  }

  contactsEmpty.classList.add('hidden');
  tableWrapper.classList.remove('hidden');

  contactsTbody.innerHTML = data.map(c => `
    <tr data-id="${c.id}">
      <td title="${esc(c.name)}">${esc(c.name) || '–'}</td>
      <td title="${esc(c.company)}">${esc(c.company) || '–'}</td>
      <td title="${esc(c.title)}">${esc(c.title) || '–'}</td>
      <td>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '–'}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '–'}</td>
      <td>${c.website ? `<a href="${esc(ensureHttp(c.website))}" target="_blank">${esc(c.website)}</a>` : '–'}</td>
      <td title="${esc(c.address)}">${esc(c.address) || '–'}</td>
      <td>${esc(c.date) || '–'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" onclick="editContact(${c.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteContact(${c.id}, '${esc(c.name || c.company)}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureHttp(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : 'https://' + url;
}

// ---- SEARCH ----
function handleSearch() {
  const q = searchInput.value.toLowerCase();
  if (!q) {
    renderTable(contacts);
    return;
  }
  const result = contacts.filter(c =>
    [c.name, c.company, c.title, c.phone, c.email, c.website, c.address]
      .some(v => v && v.toLowerCase().includes(q))
  );
  renderTable(result);
}

// ---- EDIT ----
window.editContact = function(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  fName.value    = c.name    || '';
  fCompany.value = c.company || '';
  fTitle.value   = c.title   || '';
  fPhone.value   = c.phone   || '';
  fEmail.value   = c.email   || '';
  fWebsite.value = c.website || '';
  fAddress.value = c.address || '';
  fNotes.value   = c.notes   || '';
  rawOcrText.textContent = '';
  rawOcrText.classList.add('hidden');
  saveStatus.textContent = '';

  dataForm.classList.remove('hidden');

  // Override save to update instead of insert
  const btnSave = document.getElementById('btn-save-contact');
  btnSave.textContent = '💾 Zapisz zmiany';
  btnSave.onclick = async () => {
    c.name    = fName.value.trim();
    c.company = fCompany.value.trim();
    c.title   = fTitle.value.trim();
    c.phone   = fPhone.value.trim();
    c.email   = fEmail.value.trim();
    c.website = fWebsite.value.trim();
    c.address = fAddress.value.trim();
    c.notes   = fNotes.value.trim();
    persistContacts();
    renderTable();
    dataForm.classList.add('hidden');
    btnSave.textContent = '💾 Zapisz kontakt';
    btnSave.onclick = saveContact;
    showToast('✅ Kontakt zaktualizowany!', 'success');
  };

  dataForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ---- DELETE ----
window.deleteContact = function(id, name) {
  pendingDeleteId = id;
  modalMessage.textContent = `Czy na pewno chcesz usunąć kontakt "${name}"?`;
  modalOverlay.classList.remove('hidden');
};

function executeDelete() {
  if (pendingDeleteId !== null) {
    contacts = contacts.filter(c => c.id !== pendingDeleteId);
    persistContacts();
    renderTable();
    showToast('🗑 Kontakt usunięty.', '');
    pendingDeleteId = null;
  }
  closeModal();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

function confirmClearAll() {
  if (contacts.length === 0) return;
  pendingDeleteId = 'ALL';
  modalMessage.textContent = `Czy na pewno chcesz usunąć WSZYSTKIE ${contacts.length} kontakty?`;
  modalOverlay.classList.remove('hidden');
  modalConfirm.onclick = () => {
    contacts = [];
    persistContacts();
    renderTable();
    closeModal();
    showToast('🗑 Wszystkie kontakty usunięte.', '');
    modalConfirm.onclick = executeDelete;
  };
}

// ---- EXPORT CSV ----
function exportCSV() {
  const list = filteredContacts.length > 0 ? filteredContacts : contacts;
  if (list.length === 0) {
    showToast('⚠️ Brak danych do eksportu.', 'error');
    return;
  }

  const headers = ['Data dodania','Imię i Nazwisko','Firma','Stanowisko','Telefon','E-mail','Strona WWW','Adres','Notatki'];
  const rows = list.map(c => [
    c.date, c.name, c.company, c.title, c.phone, c.email, c.website, c.address, c.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wizytowki_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('⬇️ Plik CSV pobrany!', 'success');
}

// ---- TOAST ----
let toastTimer;
function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ---- HELPERS ----
function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status-${type}`;
}
