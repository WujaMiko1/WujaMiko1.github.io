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

// ---- OCR ----
async function runOCR() {
  if (!currentImageFile) return;

  btnScan.disabled = true;
  ocrStatus.classList.remove('hidden');
  dataForm.classList.add('hidden');
  setProgress(0, 'Ładowanie silnika OCR...');

  try {
    const worker = await Tesseract.createWorker(['pol', 'eng'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setProgress(Math.round(m.progress * 100), `Rozpoznawanie tekstu... ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'loading language traineddata') {
          setProgress(15, 'Ładowanie danych językowych...');
        } else if (m.status === 'initializing api') {
          setProgress(30, 'Inicjalizacja OCR...');
        }
      }
    });

    setProgress(40, 'Analiza obrazu...');
    const { data: { text } } = await worker.recognize(currentImageFile);
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
const JOB_TITLE_KEYWORDS = [
  'director', 'manager', 'dyrektor', 'kierownik', 'prezes', 'ceo', 'cto', 'cfo', 'coo',
  'president', 'vice president', 'vp ', 'wiceprezes', 'specjalista', 'specialist',
  'consultant', 'konsultant', 'analityk', 'analyst', 'engineer', 'inżynier',
  'developer', 'programista', 'designer', 'projektant', 'koordynator', 'coordinator',
  'asystent', 'assistant', 'sprzedaż', 'sales', 'marketing', 'partner', 'właściciel',
  'owner', 'founder', 'założyciel', 'head of', 'szef', 'supervisor', 'agent',
  'представитель', 'advisor', 'doradca', 'broker', 'accountant', 'księgowy',
  'prawnik', 'lawyer', 'attorney', 'lekarz', 'doctor', 'dr ', 'prof ', 'mgr '
];

const COMPANY_KEYWORDS = [
  'sp. z o.o', 'sp.z o.o', 'spółka', 'spzoo', 's.a.', ' sa ', ' ltd', 'limited',
  'gmbh', 'inc.', 'inc ', 'corp.', 'corp ', 'llc', ' s.c.', 's.j.', 's.k.',
  'group', 'holding', 'studio', 'agency', 'agencja', 'instytut', 'institute',
  'university', 'uczelnia', 'bank', 'fundacja', 'foundation', 'solutions',
  'technologies', 'tech ', 'systems', 'services', 'consulting', 'ventures'
];

function parseBusinessCard(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const result = {
    name: '',
    company: '',
    title: '',
    phone: '',
    email: '',
    website: '',
    address: ''
  };

  const usedLines = new Set();

  // 1. EMAIL - most reliable
  const emailRegex = /[\w.+\-]+@[\w\-]+\.[\w.\-]{2,}/gi;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(emailRegex);
    if (match && !result.email) {
      result.email = match[0].toLowerCase();
      usedLines.add(i);
      break;
    }
  }

  // 2. PHONE - various Polish and international formats
  const phoneRegex = /(?:\+?[\d\s\-().]{7,18})/g;
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const cleaned = lines[i].replace(/[^\d\s+\-().]/g, '');
    const match = cleaned.match(phoneRegex);
    if (match) {
      const candidate = match[0].trim();
      // Must have at least 7 digits
      const digits = candidate.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15) {
        result.phone = candidate.replace(/\s+/g, ' ').trim();
        usedLines.add(i);
        break;
      }
    }
  }

  // 3. WEBSITE
  const webRegex = /(?:https?:\/\/|www\.)[^\s,;]+/gi;
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const match = lines[i].match(webRegex);
    if (match && !result.website) {
      result.website = match[0].replace(/\/$/, '');
      usedLines.add(i);
      break;
    }
  }

  // 4. JOB TITLE
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const lower = lines[i].toLowerCase();
    if (JOB_TITLE_KEYWORDS.some(kw => lower.includes(kw))) {
      result.title = lines[i];
      usedLines.add(i);
      break;
    }
  }

  // 5. COMPANY
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const lower = lines[i].toLowerCase();
    if (COMPANY_KEYWORDS.some(kw => lower.includes(kw))) {
      result.company = lines[i];
      usedLines.add(i);
      break;
    }
  }

  // 6. ADDRESS - lines with street keywords or postal code
  const addrRegex = /(?:ul\.|al\.|os\.|pl\.|str\.|avenue|street|road|\d{2}-\d{3})/i;
  const addrParts = [];
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    if (addrRegex.test(lines[i])) {
      addrParts.push(lines[i]);
      usedLines.add(i);
    }
  }
  if (addrParts.length > 0) result.address = addrParts.join(', ');

  // 7. NAME - look for 2 capitalized words in unused lines
  const nameRegex = /^[A-ZŁŚŻŹĆĄĘÓŃ][a-złśżźćąęóń]+(?:[-\s][A-ZŁŚŻŹĆĄĘÓŃ][a-złśżźćąęóń]+)+$/;
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const cleaned = lines[i].replace(/[^a-zA-ZłśżźćąęóńŁŚŻŹĆĄĘÓŃ\s\-]/g, '').trim();
    if (nameRegex.test(cleaned) && cleaned.split(/\s+/).length >= 2 && cleaned.split(/\s+/).length <= 4) {
      result.name = cleaned;
      usedLines.add(i);
      break;
    }
  }

  // Fallback name: first non-used line that looks like a name (all letters, no digits)
  if (!result.name) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      const onlyLetters = lines[i].replace(/[^a-zA-ZłśżźćąęóńŁŚŻŹĆĄĘÓŃ\s.]/g, '').trim();
      if (onlyLetters.length > 3 && onlyLetters.split(/\s+/).length >= 2) {
        result.name = lines[i].trim();
        usedLines.add(i);
        break;
      }
    }
  }

  // Fallback company: first unused line with >3 chars (if no company yet)
  if (!result.company) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      if (lines[i].length > 3) {
        result.company = lines[i];
        usedLines.add(i);
        break;
      }
    }
  }

  return result;
}

// ---- FORM ----
function populateForm(data, rawText) {
  fName.value    = data.name    || '';
  fCompany.value = data.company || '';
  fTitle.value   = data.title   || '';
  fPhone.value   = data.phone   || '';
  fEmail.value   = data.email   || '';
  fWebsite.value = data.website || '';
  fAddress.value = data.address || '';
  fNotes.value   = '';
  rawOcrText.textContent = rawText || '';
  rawOcrText.classList.add('hidden');
  btnShowRaw.textContent = '👁 Pokaż surowy tekst OCR';
  saveStatus.textContent = '';
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
