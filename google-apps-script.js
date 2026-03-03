/**
 * SKANER WIZYTÓWEK - Google Apps Script
 * 
 * INSTRUKCJA INSTALACJI:
 * 1. Otwórz Google Sheets: https://sheets.google.com
 * 2. Utwórz nowy arkusz i nazwij go np. "Wizytówki"
 * 3. Kliknij: Rozszerzenia → Apps Script
 * 4. Usuń istniejący kod i wklej cały ten plik
 * 5. Kliknij 💾 Zapisz
 * 6. Kliknij: Wdróż → Nowe wdrożenie
 *    - Typ: Aplikacja internetowa
 *    - Wykonaj jako: Ja (swoje konto)
 *    - Kto ma dostęp: Wszyscy
 * 7. Kliknij "Wdróż" → skopiuj URL wdrożenia
 * 8. Wklej URL w ustawieniach aplikacji Skaner Wizytówek
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data dodania',
        'Imię i Nazwisko',
        'Firma',
        'Stanowisko',
        'Telefon',
        'E-mail',
        'Strona WWW',
        'Adres',
        'Notatki'
      ]);
      
      // Style header row
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#2563eb');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    // Parse form data
    var params = e.parameter;
    
    sheet.appendRow([
      params.date    || new Date().toLocaleDateString('pl-PL'),
      params.name    || '',
      params.company || '',
      params.title   || '',
      params.phone   || '',
      params.email   || '',
      params.website || '',
      params.address || '',
      params.notes   || ''
    ]);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 9);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Skaner Wizytowek API dziala!' }))
    .setMimeType(ContentService.MimeType.JSON);
}
