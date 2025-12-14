// Backend Sound interface (matches API response from /api/sound)
export interface Sound {
  hash: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  durationMs: number;
  enabled: boolean;
  createdAt: string;
  tags: string[];
  playCount: number;
}

// Upload response from POST /api/sound/upload
export interface UploadResponse {
  hash: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  tags: string[];
}
