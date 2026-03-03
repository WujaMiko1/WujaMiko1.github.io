# 📇 Skaner Wizytówek

Darmowa aplikacja PWA do skanowania wizytówek z automatycznym zapisem do Google Sheets.

**Działa na iPhone bez instalacji z App Store!**

---

## ✅ Co robi aplikacja?

- Robi zdjęcie wizytówki aparatem iPhone
- OCR automatycznie wyciąga tekst z obrazu (Tesseract.js – działa w przeglądarce, bez API)
- Automatycznie rozpoznaje: Imię/Nazwisko, Firma, Stanowisko, Telefon, E-mail, WWW, Adres
- Zapisuje kontakty lokalnie + wysyła do Google Sheets
- Eksport do CSV/Excel
- Wyszukiwarka, edycja i usuwanie kontaktów

---

## 🚀 KROK 1 – Wygeneruj ikony aplikacji

1. Otwórz plik `generate-icons.html` w przeglądarce (na komputerze)
2. Kliknij przycisk `Pobierz icon-192.png` i `Pobierz icon-512.png`
3. Przenieś pobrane ikony do folderu `icons/`

---

## 🚀 KROK 2 – Wrzuć aplikację na GitHub Pages (darmowy hosting)

### 2.1 Utwórz konto GitHub (jeśli nie masz)
→ https://github.com/join

### 2.2 Utwórz nowe repozytorium
1. Zaloguj się na github.com
2. Kliknij **„New repository"** (zielony przycisk)
3. Nazwa: `skaner-wizytowek` (lub dowolna)
4. Zaznacz **„Public"**
5. Kliknij **„Create repository"**

### 2.3 Wgraj pliki
1. W nowym repo kliknij **„uploading an existing file"**
2. Przeciągnij WSZYSTKIE pliki z folderu projektu:
   - `index.html`
   - `style.css`
   - `app.js`
   - `sw.js`
   - `manifest.json`
   - folder `icons/` (z oboma ikonami PNG)
3. Kliknij **„Commit changes"**

### 2.4 Włącz GitHub Pages
1. W repo kliknij **Settings** (u góry)
2. Przewiń do sekcji **„Pages"** (lewe menu)
3. Source: **„Deploy from a branch"**
4. Branch: **main** → folder **/ (root)**
5. Kliknij **Save**
6. Po chwili (1-2 min) aplikacja będzie dostępna pod adresem:
   ```
   https://TWOJA-NAZWA.github.io/skaner-wizytowek/
   ```

---

## 🚀 KROK 3 – Skonfiguruj Google Sheets (zapis do arkusza)

### 3.1 Utwórz arkusz Google
1. Otwórz https://sheets.google.com
2. Utwórz nowy arkusz, nazwij go np. **„Wizytówki"**

### 3.2 Stwórz Apps Script
1. Kliknij **Rozszerzenia → Apps Script**
2. Usuń cały istniejący kod
3. Otwórz plik `google-apps-script.js` z projektu i skopiuj jego zawartość
4. Wklej do edytora Apps Script
5. Kliknij 💾 **Zapisz** (ikona dyskietki)

### 3.3 Wdróż jako aplikację internetową
1. Kliknij **„Wdróż"** (niebieski przycisk, prawy górny róg)
2. Wybierz **„Nowe wdrożenie"**
3. Kliknij ikonę ⚙️ przy „Typ" → wybierz **„Aplikacja internetowa"**
4. Ustaw:
   - **Wykonaj jako:** Ja (Twoje konto Google)
   - **Kto ma dostęp:** Wszyscy
5. Kliknij **„Wdróż"**
6. Zatwierdź uprawnienia (kliknij „Autoryzuj dostęp" → wybierz konto → „Zezwól")
7. **Skopiuj URL wdrożenia** (wygląda jak: `https://script.google.com/macros/s/ABC.../exec`)

### 3.4 Wklej URL w aplikacji
1. Otwórz aplikację na iPhone
2. Kliknij ⚙️ (ustawienia, prawy górny róg)
3. Wklej skopiowany URL Apps Script
4. Kliknij **„Testuj połączenie"** – w arkuszu powinien pojawić się wiersz TEST
5. Kliknij **„Zapisz"**

---

## 📱 KROK 4 – Dodaj do ekranu głównego iPhone (opcjonalne)

1. Otwórz aplikację w Safari na iPhone
2. Kliknij ikonę **Udostępnij** (kwadrat ze strzałką)
3. Przewiń i kliknij **„Dodaj do ekranu głównego"**
4. Kliknij **„Dodaj"**

Aplikacja będzie wyglądać jak natywna aplikacja iPhone!

---

## 💡 Jak używać?

1. Otwórz aplikację na iPhone
2. Dotknij **📷 Skanuj wizytówkę**
3. Zrób zdjęcie wizytówki lub wybierz z galerii
4. Kliknij **🔍 Skanuj i wyciągnij dane**
5. Poczekaj chwilę – OCR przetworzy zdjęcie
6. Sprawdź i ewentualnie popraw wyciągnięte dane
7. Kliknij **💾 Zapisz kontakt**
8. Dane pojawią się w tabeli i w Google Sheets!

---

## 🔧 Wskazówki dotyczące zdjęć

- Rób zdjęcia przy dobrym oświetleniu
- Wizytówka powinna zajmować większość kadru
- Unikaj błyszczących wizytówek (odbicia psują OCR)
- Im wyraźniejszy tekst na wizytówce, tym lepszy wynik OCR

---

## 📁 Struktura plików

```
skaner-wizytowek/
├── index.html              ← Główny plik aplikacji
├── style.css               ← Style (wygląd)
├── app.js                  ← Logika aplikacji + OCR parser
├── sw.js                   ← Service Worker (offline)
├── manifest.json           ← PWA manifest
├── google-apps-script.js   ← Kod do wklejenia w Google Apps Script
├── generate-icons.html     ← Generator ikon (uruchom raz)
└── icons/
    ├── icon-192.png        ← Ikona aplikacji 192x192
    └── icon-512.png        ← Ikona aplikacji 512x512
```

---

## 🆓 Całkowicie darmowe

| Komponent | Koszt |
|-----------|-------|
| GitHub Pages (hosting) | Darmowe |
| Tesseract.js (OCR) | Darmowe, open-source |
| Google Sheets | Darmowe |
| Google Apps Script | Darmowe |
| **RAZEM** | **0 zł** |

---

## ❓ FAQ

**Q: Czy dane są bezpieczne?**
A: Dane OCR są przetwarzane lokalnie w przeglądarce iPhone (Tesseract.js nie wysyła zdjęć na serwer). Tylko wypełniony formularz jest wysyłany do Twojego prywatnego Google Sheets.

**Q: Czy działa offline?**
A: Częściowo – interfejs ładuje się offline, ale OCR wymaga internetu (pobiera model językowy przez CDN przy pierwszym użyciu).

**Q: Czy mogę używać na Androidzie też?**
A: Tak! Aplikacja działa na każdym telefonie z przeglądarką (Chrome, Safari, Firefox).

**Q: OCR się myli – co robić?**
A: Zawsze możesz ręcznie poprawić dane w formularzu przed zapisaniem. Kliknij też „Pokaż surowy tekst OCR" aby zobaczyć co rozpoznał skaner.
