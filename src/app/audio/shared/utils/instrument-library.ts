import { SoundLibraryItem, SOUND_LIBRARY } from './sound-library';

// Instrument-Kategorien (ohne FX - die kommen von der Nervbox API)
export const INSTRUMENT_CATEGORIES = ['All', 'Bass', 'Drums', 'Synth'] as const;
export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

// Gefilterte Library: nur Bass, Drums, Synth (222 Sounds)
// Diese Sounds werden aus /assets/instruments/ geladen
export const INSTRUMENT_LIBRARY: SoundLibraryItem[] = SOUND_LIBRARY.filter(
  (sound) =>
    sound.category === 'Bass' ||
    sound.category === 'Drums' ||
    sound.category === 'Synth'
);

// Hilfsfunktion: Sounds nach Kategorie abrufen
export const getInstrumentsByCategory = (
  category: InstrumentCategory
): SoundLibraryItem[] => {
  if (category === 'All') return INSTRUMENT_LIBRARY;
  return INSTRUMENT_LIBRARY.filter((s) => s.category === category);
};

// Anzahl Sounds pro Kategorie (für UI-Anzeige)
export const INSTRUMENT_COUNTS: Record<InstrumentCategory, number> = {
  All: INSTRUMENT_LIBRARY.length,
  Bass: INSTRUMENT_LIBRARY.filter((s) => s.category === 'Bass').length,
  Drums: INSTRUMENT_LIBRARY.filter((s) => s.category === 'Drums').length,
  Synth: INSTRUMENT_LIBRARY.filter((s) => s.category === 'Synth').length,
};
