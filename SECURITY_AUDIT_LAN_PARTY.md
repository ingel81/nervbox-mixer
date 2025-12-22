# 🔒 Security Audit: NervBox Mixer (LAN Party Kontext)

**Audit Datum:** 2025-12-22
**Kontext:** LAN Party mit mehreren Benutzern im gleichen Netzwerk
**Scope:** Frontend Angular App + Backend API Integration
**Auditor:** Claude Code Security Analysis

---

## 📋 Executive Summary

Das NervBox Mixer Projekt wurde auf Sicherheitslücken untersucht, die in einem LAN-Party-Kontext ausgenutzt werden könnten. Die Analyse identifizierte **8 signifikante Schwachstellen** mit unterschiedlichen Risiko-Levels.

### Risiko-Übersicht
- 🔴 **CRITICAL**: 2 Findings
- 🟠 **HIGH**: 3 Findings
- 🟡 **MEDIUM**: 2 Findings
- 🟢 **LOW**: 1 Finding

---

## 🔴 CRITICAL Findings

### 1. JWT Token in LocalStorage ohne HttpOnly Protection

**Location:** `src/app/core/interceptors/jwt.interceptor.ts:6`

**Beschreibung:**
Der JWT Token wird in `localStorage` unter dem Key `nervbox_token` gespeichert, was anfällig für XSS-Angriffe ist.

```typescript
const TOKEN_KEY = 'nervbox_token';
const token = localStorage.getItem(TOKEN_KEY);
```

**LAN Party Exploit-Scenario:**
1. Angreifer injiziert bösartiges Script (z.B. über Sound-Upload oder manipulierte Arrangements)
2. Script liest `localStorage.getItem('nervbox_token')` aus
3. Angreifer kann sich mit gestohlenem Token als anderer User authentifizieren
4. Zugriff auf Favoriten, Uploads, private Arrangements

**Affected Files:**
- `src/app/core/interceptors/jwt.interceptor.ts`
- `src/app/core/services/favorites.service.ts:21`
- `src/app/core/services/upload.service.ts:45`

**Empfehlung:**
- JWT Tokens in **httpOnly Cookies** statt localStorage speichern
- Falls localStorage notwendig: Zusätzliche XSS-Protection Layers implementieren
- Token Expiration mit kurzer Lebensdauer (max. 1h)
- Refresh Token Mechanismus

**Risk Score:** 9.5/10

---

### 2. Fehlende Input Validation bei File Uploads

**Location:** `src/app/audio/audio-engine/services/file-import.service.ts:20-104`

**Beschreibung:**
Die `importFiles()` Methode akzeptiert beliebige `FileList` Objekte ohne Validierung von:
- File Type (MIME Type Checking)
- File Size Limits
- Malicious File Content

```typescript
async importFiles(files: FileList | null, targetTrack?: Track): Promise<void> {
  if (!files || files.length === 0) return;
  // ⚠️ KEINE VALIDIERUNG!
  const filesArray = Array.from(files);
  // Direkt decode ohne Checks
  return await this.audioEngine.decode(f);
}
```

**LAN Party Exploit-Scenario:**
1. Angreifer erstellt manipulierte Audio-Datei mit extremer Größe (z.B. 2GB WAV)
2. Upload führt zu Memory Exhaustion
3. Browser aller Teilnehmer crasht (Denial of Service)
4. Oder: Malicious polyglot file (WAV/HTML) könnte zu unerwarteten Parsing-Fehlern führen

**Affected Files:**
- `src/app/audio/audio-engine/services/file-import.service.ts`
- `src/app/audio/audio-engine/services/audio-engine.service.ts:44-47`

**Empfehlung:**
```typescript
// Validierung hinzufügen:
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'];

for (const file of filesArray) {
  // Size Check
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.name}`);
  }

  // MIME Type Check
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  // Magic Number Verification (echte Audio-Datei?)
  const header = await file.slice(0, 12).arrayBuffer();
  // ... verify WAV/MP3 headers
}
```

**Risk Score:** 9.0/10

---

## 🟠 HIGH Findings

### 3. LocalStorage Arrangement Injection

**Location:** `src/app/audio/arrangements/services/arrangement-storage.service.ts:52-72`

**Beschreibung:**
Arrangements werden direkt aus `localStorage` geladen ohne Validierung der Datenstruktur. Ein Angreifer könnte bösartige Arrangements injizieren.

```typescript
private loadArrangementsFromStorage() {
  const stored = localStorage.getItem(this.STORAGE_KEY);
  if (stored) {
    const arrangements = JSON.parse(stored); // ⚠️ Unvalidated JSON!
    this.savedArrangements.set(arrangements);
  }
}
```

**LAN Party Exploit-Scenario:**
1. Angreifer öffnet DevTools auf eigenem Browser
2. Injiziert manipuliertes Arrangement in localStorage:
```javascript
localStorage.setItem('nervbox-arrangements', JSON.stringify([{
  id: "malicious",
  arrangement: {
    name: "<img src=x onerror=alert(document.cookie)>", // XSS Attempt
    tracks: [/* ... huge array causing DoS ... */]
  }
}]));
```
3. Beim nächsten Laden: Potenzielle XSS oder DoS durch zu große Datenstrukturen

**Affected Files:**
- `src/app/audio/arrangements/services/arrangement-storage.service.ts`

**Empfehlung:**
- JSON Schema Validation vor dem Parsing
- Sanitization von arrangement names/properties
- Size Limits für gespeicherte Arrangements
```typescript
import Ajv from 'ajv';
const ajv = new Ajv();
const schema = { /* arrangement schema */ };
const validate = ajv.compile(schema);
if (!validate(arrangements)) {
  console.error('Invalid arrangement data');
  return;
}
```

**Risk Score:** 7.5/10

---

### 4. Audio Buffer Memory Exhaustion

**Location:** `src/app/audio/audio-engine/services/audio-engine.service.ts:180-266`

**Beschreibung:**
Die `renderToMp3()` und `renderToWav()` Funktionen erstellen `OfflineAudioContext` ohne Memory Limits.

```typescript
async renderToMp3(options: { clips: Iterable<PlayableClip>; duration: number }): Promise<Blob> {
  const length = Math.ceil(options.duration * sampleRate);
  // ⚠️ Keine Limits! Kann beliebig groß sein
  const off = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });
}
```

**LAN Party Exploit-Scenario:**
1. Angreifer erstellt Arrangement mit 10+ Stunden Länge
2. Versucht MP3 Export
3. Browser allokiert mehrere GB RAM für OfflineAudioContext
4. System wird instabil, andere Tabs crashen

**Affected Files:**
- `src/app/audio/audio-engine/services/audio-engine.service.ts`

**Empfehlung:**
```typescript
const MAX_EXPORT_DURATION = 600; // 10 Minuten
if (options.duration > MAX_EXPORT_DURATION) {
  throw new Error(`Export duration exceeds limit: ${options.duration}s`);
}
```

**Risk Score:** 7.0/10

---

### 5. Fehlende CORS Configuration für API

**Location:** `src/app/core/services/api.service.ts`

**Beschreibung:**
Der API Service verwendet `environment.nervboxApi` ohne sichtbare CORS-Konfiguration. Im LAN-Modus könnten Cross-Origin Requests problematisch sein.

```typescript
private readonly baseUrl = environment.nervboxApi ?? '';
// Kein CORS Header Management
```

**LAN Party Exploit-Scenario:**
1. Angreifer hostet eigene bösartige Seite im LAN
2. Lädt NervBox Mixer Assets von offiziellem Server
3. Führt CSRF-Angriffe gegen NervBox API aus
4. Kann Sounds hochladen, Favoriten manipulieren unter Identity des Users

**Affected Files:**
- `src/app/core/services/api.service.ts`
- `src/environments/environment.lan.ts`

**Empfehlung:**
- Backend: Strikte CORS Policy nur für vertrauenswürdige Origins
- Frontend: CSRF Token Mechanismus implementieren
- SameSite Cookie Attribute auf 'Strict' setzen

**Risk Score:** 7.0/10

---

## 🟡 MEDIUM Findings

### 6. Unvalidiertes Sound Library Loading von External API

**Location:** `src/app/audio/sound-browser/services/sound-library.service.ts:149-181`

**Beschreibung:**
Sounds werden von `environment.nervboxApi` geladen ohne Validierung der Response-Daten.

```typescript
private async loadFromApi(): Promise<void> {
  const apiSounds = await firstValueFrom(
    this.http.get<Sound[]>(`${environment.nervboxApi}/sound`)
  );
  // ⚠️ Keine Validierung der Response
  const mappedSounds: SoundLibraryItem[] = apiSounds.map(s => ({
    name: s.name, // Könnte XSS payload enthalten
    tags: s.tags,  // Unvalidiert
  }));
}
```

**LAN Party Exploit-Scenario:**
1. Angreifer kompromittiert LAN API Server oder macht Man-in-the-Middle
2. Sendet manipulierte Sound Library mit XSS in `name` Feldern
3. Beim Rendern in UI werden Scripts ausgeführt

**Affected Files:**
- `src/app/audio/sound-browser/services/sound-library.service.ts`

**Empfehlung:**
- Response Schema Validation
- Sanitization von allen String-Feldern
- Content Security Policy Headers

**Risk Score:** 6.0/10

---

### 7. Recording Service - Microphone Permission Abuse

**Location:** `src/app/audio/audio-engine/services/recording.service.ts:31-80`

**Beschreibung:**
Recording Service fragt Mikrofon-Permission an ohne User-sichtbare Warnung über Datenschutz-Implikationen.

```typescript
async startRecording(): Promise<void> {
  this.stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    }
  });
}
```

**LAN Party Exploit-Scenario:**
1. Bösartige Browser Extension oder manipulierte App fordert Recording an
2. User klickt aus Versehen "Allow"
3. Mikrofon wird ohne sichtbare Indication aktiviert
4. Private Gespräche könnten aufgezeichnet werden

**Affected Files:**
- `src/app/audio/audio-engine/services/recording.service.ts`

**Empfehlung:**
- Sichtbare UI-Indication während Recording (rotes Licht)
- Explizite Consent-Dialog vor getUserMedia()
- Auto-Stop nach Timeout (z.B. 5 Minuten)

**Risk Score:** 5.0/10

---

## 🟢 LOW Findings

### 8. Analytics Tracking ohne zusätzliche Privacy Controls

**Location:** `src/app/services/analytics.service.ts`

**Beschreibung:**
Google Analytics wird geladen wenn User consent gibt, aber es gibt keine zusätzlichen Privacy-Features wie IP Anonymization.

**Empfehlung:**
- IP Anonymization aktivieren
- Minimal data collection (nur essentials)
- Local analytics in LAN mode (kein external tracking)

**Risk Score:** 3.0/10

---

## 📊 Dependencies Vulnerability Scan

### Kritische Dependencies:

```json
{
  "@angular/core": "^20.1.6",           // ✅ Aktuell, keine CVEs
  "@breezystack/lamejs": "^1.2.7",      // ⚠️ Kleines Package, audit empfohlen
  "tone": "^15.1.22",                   // ✅ Aktuell
  "rxjs": "^7.8.1",                     // ✅ Aktuell
  "typescript": "~5.8.3"                // ✅ Aktuell
}
```

**Empfehlung:**
```bash
npm audit
npm audit fix --force
```

---

## 🛡️ Mitigation Priority Roadmap

### Sofortige Maßnahmen (vor LAN Party):
1. ✅ File Upload Validation implementieren (Finding #2)
2. ✅ Export Duration Limits setzen (Finding #4)
3. ✅ Arrangement Size Limits in localStorage (Finding #3)

### Mittelfristig:
4. JWT Token zu httpOnly Cookies migrieren (Finding #1)
5. CORS Policy verschärfen (Finding #5)
6. Response Validation für API calls (Finding #6)

### Langfristig:
7. Content Security Policy implementieren
8. Penetration Testing durchführen
9. Security Headers (HSTS, X-Frame-Options, etc.)

---

## 🔍 Testing Recommendations

### Manual Testing Checklist:
- [ ] Upload 2GB Audio-Datei → sollte rejected werden
- [ ] LocalStorage manipulation → App sollte graceful degradation zeigen
- [ ] Arrangement mit 1000+ Tracks → Performance-Test
- [ ] XSS in Sound Names → sollte escaped werden
- [ ] Export 2h Audio → sollte Limit-Error zeigen
- [ ] Token stealing via DevTools → HttpOnly Cookie sollte nicht lesbar sein

### Automated Testing:
```bash
# ZAP Security Scan
zap-cli quick-scan http://localhost:4200

# OWASP Dependency Check
npm install -g @cyclonedx/cyclonedx-npm
cyclonedx-npm --output-file bom.xml
```

---

## 📝 Zusammenfassung

Die NervBox Mixer App hat mehrere exploitierbare Schwachstellen im LAN-Party Kontext. Die kritischsten Probleme sind:

1. **Fehlende Input Validation** bei File Uploads (DoS-Vektor)
2. **JWT Token Exposure** via localStorage (Token Theft)
3. **Memory Exhaustion** durch unbegrenzte Audio Verarbeitung

**Positiv aufgefallen:**
- ✅ Kein `innerHTML` / `eval()` usage gefunden
- ✅ Angular's built-in XSS Protection aktiv
- ✅ Moderne Dependencies ohne bekannte CVEs
- ✅ TypeScript Strict Mode aktiviert

**Empfohlene Actions:**
Implementiere die Top 3 Findings vor der nächsten LAN Party, um die größten Risiken zu mitigieren.

---

**Audit abgeschlossen:** 2025-12-22
**Next Review:** Nach Implementation der Critical Fixes
