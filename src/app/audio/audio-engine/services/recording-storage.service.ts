import { Injectable } from '@angular/core';

const DB_NAME = 'nervbox-recordings';
const DB_VERSION = 1;
const STORE_NAME = 'audio-recordings';

export interface StoredRecording {
  id: string;
  name: string;
  createdAt: string;
  blob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
}

@Injectable({ providedIn: 'root' })
export class RecordingStorageService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.initDatabase();
  }

  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Speichert einen AudioBuffer als WAV-Blob in IndexedDB
   * @returns Die generierte Recording-ID mit "recording:" Prefix
   */
  async saveRecording(audioBuffer: AudioBuffer, name: string): Promise<string> {
    await this.dbReady;

    const id = `recording:${crypto.randomUUID()}`;
    const blob = this.audioBufferToWav(audioBuffer);

    const recording: StoredRecording = {
      id,
      name,
      createdAt: new Date().toISOString(),
      blob,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(recording);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Lädt ein Recording aus IndexedDB und dekodiert es zu AudioBuffer
   */
  async loadRecording(id: string, audioContext: AudioContext): Promise<AudioBuffer | null> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = async () => {
        const recording = request.result as StoredRecording | undefined;
        if (!recording) {
          resolve(null);
          return;
        }

        try {
          const arrayBuffer = await recording.blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          resolve(audioBuffer);
        } catch (error) {
          console.error(`Error decoding recording ${id}:`, error);
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Prüft ob eine ID eine Recording-ID ist
   */
  isRecordingId(id: string): boolean {
    return id.startsWith('recording:');
  }

  /**
   * Löscht ein Recording aus IndexedDB
   */
  async deleteRecording(id: string): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Listet alle gespeicherten Recordings (ohne Blob-Daten)
   */
  async listRecordings(): Promise<Omit<StoredRecording, 'blob'>[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const recordings = request.result.map(
          (r: StoredRecording): Omit<StoredRecording, 'blob'> => ({
            id: r.id,
            name: r.name,
            createdAt: r.createdAt,
            duration: r.duration,
            sampleRate: r.sampleRate,
            channels: r.channels,
          })
        );
        resolve(recordings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Konvertiert AudioBuffer zu WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);

    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(o + i, s.charCodeAt(i));
      }
    };

    // RIFF header
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeStr(8, 'WAVE');

    // fmt chunk
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);

    // data chunk
    writeStr(36, 'data');
    view.setUint32(40, buffer.length * numChannels * 2, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([out], { type: 'audio/wav' });
  }
}
