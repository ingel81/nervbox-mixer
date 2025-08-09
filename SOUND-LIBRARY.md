# 🎵 NervBox Sound Mixer - Library Setup

Das Sound Library System scannt automatisch deine Audio-Dateien und erstellt eine typsichere Konfiguration.

## 🚀 Quick Start

1. **Audio-Dateien hinzufügen:**
   ```bash
   # Kopiere deine MP3/WAV-Dateien nach:
   src/assets/sounds/
   ```

2. **Library scannen:**
   ```bash
   npm run scan-sounds
   ```

3. **Dev-Server neustarten:**
   ```bash
   npm start
   ```

## 📁 Unterstützte Formate
- MP3 (empfohlen)
- WAV
- OGG
- M4A
- AAC

## 🏷️ Automatische Kategorisierung

Das Script erkennt automatisch Kategorien basierend auf Dateinamen:

| Kategorie | Keywords |
|-----------|----------|
| **Drums** | kick, snare, hihat, crash, drum |
| **Bass** | bass, sub, low |
| **Synth** | synth, lead, pad, pluck, saw |
| **Vocals** | vocal, voice, chop |
| **FX** | fx, riser, drop, sweep, impact |
| **Ambient** | ambient, atmosphere, texture, noise |

## 📝 Beispiel-Dateinamen
```
kick-deep.mp3         → Drums, tags: [drums, kick, deep]
bass-wobble.wav       → Bass, tags: [bass, wobble]
synth-lead-bright.mp3 → Synth, tags: [synth, lead, bright]
vocal-chop-female.mp3 → Vocals, tags: [vocal, chop, female]
fx-riser-buildup.wav  → FX, tags: [fx, riser, buildup]
```

## 🔄 Workflow

1. Dateien zu `src/assets/sounds/` hinzufügen
2. `npm run scan-sounds` ausführen
3. `src/app/audio/sound-library.ts` wird automatisch generiert
4. Dev-Server neustarten für Live-Updates

## ⚙️ Was passiert beim Scannen?

- Alle Audio-Dateien werden erkannt
- Kategorien werden aus Dateinamen abgeleitet
- Tags werden automatisch generiert
- TypeScript-Konfiguration wird erstellt
- Display-Namen werden formatiert (z.B. "kick_deep" → "Kick Deep")

## 🎯 Tipps

- **Beschreibende Dateinamen verwenden** für bessere Auto-Kategorisierung
- **Kurze Samples** (1-8 Sekunden) funktionieren am besten
- **Konsistente Benennung** hilft bei der Organisation
- Nach Änderungen immer **`npm run scan-sounds`** ausführen