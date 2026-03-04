/**
 * WIZYTÓWKOSKAN – Google Apps Script
 *
 * INSTRUKCJA INSTALACJI:
 * 1. Otwórz Google Sheets: https://sheets.google.com
 * 2. Utwórz nowy arkusz i nazwij go np. "Wizytówki"
 * 3. Kliknij: Rozszerzenia → Apps Script
 * 4. Usuń istniejący kod i wklej CAŁY ten plik
 * 5. WAŻNE: Zmień wartość SYNC_KEY poniżej na własne, tajne hasło!
 * 6. Kliknij 💾 Zapisz
 * 7. Kliknij: Wdróż → Nowe wdrożenie
 *    - Typ: Aplikacja internetowa
 *    - Wykonaj jako: Ja (swoje konto)
 *    - Kto ma dostęp: Wszyscy
 * 8. Kliknij "Wdróż" → skopiuj URL wdrożenia
 * 9. Wklej URL + to samo hasło SYNC_KEY w ustawieniach aplikacji
 */

// ── ZMIEŃ NA WŁASNE HASŁO SYNCHRONIZACJI ──
var SYNC_KEY = 'ZMIEN_TO_NA_SWOJE_HASLO';

var HEADERS = ['ID','Data','Imię i Nazwisko','Firma','Stanowisko','NIP','Telefon','E-mail','Strona WWW','Adres','Notatki'];
var NUM_COLS = HEADERS.length;

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var hr = sheet.getRange(1, 1, 1, NUM_COLS);
    hr.setFontWeight('bold');
    hr.setBackground('#0d1117');
    hr.setFontColor('#3b82f6');
    sheet.setFrozenRows(1);
  }
}

// ── POST: zapisz / aktualizuj kontakt ────────────────
function doPost(e) {
  try {
    var params = e.parameter;
    if (params.key !== SYNC_KEY) {
      return ContentService.createTextOutput(JSON.stringify({status:'error',message:'Unauthorized'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getSheet();
    ensureHeaders(sheet);

    var rowId = params.id || '';
    var newRow = [
      rowId,
      params.date    || new Date().toLocaleDateString('pl-PL'),
      params.name    || '',
      params.company || '',
      params.title   || '',
      params.nip     || '',
      params.phone   || '',
      params.email   || '',
      params.website || '',
      params.address || '',
      params.notes   || '',
    ];

    // Update existing row if ID matches
    if (rowId) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === rowId) {
          sheet.getRange(i + 1, 1, 1, NUM_COLS).setValues([newRow]);
          sheet.autoResizeColumns(1, NUM_COLS);
          return ContentService.createTextOutput(JSON.stringify({status:'updated'}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Otherwise append
    sheet.appendRow(newRow);
    sheet.autoResizeColumns(1, NUM_COLS);

    return ContentService.createTextOutput(JSON.stringify({status:'ok'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── GET: pobierz wszystkie kontakty (sync) ────────────
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};

    if (params.action === 'list') {
      if (params.key !== SYNC_KEY) {
        return ContentService.createTextOutput(JSON.stringify({status:'error',message:'Unauthorized'}))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var sheet = getSheet();
      var data  = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
      }

      var contacts = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        contacts.push({
          id:      String(row[0]  || ''),
          date:    String(row[1]  || ''),
          name:    String(row[2]  || ''),
          company: String(row[3]  || ''),
          title:   String(row[4]  || ''),
          nip:     String(row[5]  || ''),
          phone:   String(row[6]  || ''),
          email:   String(row[7]  || ''),
          website: String(row[8]  || ''),
          address: String(row[9]  || ''),
          notes:   String(row[10] || ''),
        });
      }

      return ContentService.createTextOutput(JSON.stringify(contacts))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: health check
    return ContentService.createTextOutput(JSON.stringify({status:'ok',message:'Wizytowkoskan API dziala!'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
