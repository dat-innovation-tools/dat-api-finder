# DAT API Finder

Wizard zum Auffinden der passenden DAT-Schnittstellenfunktion (Kategorie → Funktion → Ergebnis mit WSDL/Service).

## Dateien
- `API_Finder.html` – Einstiegspunkt
- `script.js` – komplette Wizard-Logik
- `style.css` – Styling (DAT Corporate Design)
- `apiDatameta.json` – technische Metadaten (Service, WSDL-Pfade, Funktionen) je Kategorie/Option
- `de.json` / `en.json` – i18n-Texte (Labels, Beschreibungen, UI-Strings)
- `data.js` – gebündelte Fallback-Version von apiDatameta.json + de.json + en.json für Umgebungen ohne fetch() (z. B. file://)
- `i18n/` – Kopien von de.json/en.json für den fetch()-Ladepfad zur Laufzeit

WICHTIG: `data.js` muss nach jeder Änderung an apiDatameta.json/de.json/en.json neu synchronisiert werden (Bundle-Struktur: `{meta: ..., i18n: {de: ..., en: ...}}`).

## Umgebungen
- GOLD (Vorproduktion): erkannt über `window.location.hostname.includes('gold.dat.de')`
- WSDL-Host wird für GOLD automatisch von `www.datgroup.com` auf `gold.datgroup.com` umgeschrieben (siehe `applyEnvironmentHost()` in script.js)

## Stand
Siehe Git-Log für den Änderungsverlauf. Aktueller Stand: DAT API Finder v2.1.1,
inkl. fachlicher Korrekturen (equipment/vehicleIdentification/vehicleSelection),
neuer Identifikationsfunktionen, UX-Fixes, CI-Farben, GOLD/PROD-Linkkorrektur,
Textkorrektur Doku-Link, strukturiertem Support-Formular-Link im Footer und
Entfernung des irreführenden "Öffnen"-Buttons bei REST-Endpunkten (v2.1.1).
