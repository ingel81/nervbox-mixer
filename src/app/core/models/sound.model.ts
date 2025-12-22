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
  // Extended fields for votes and author
  authorId?: number;
  upVotes?: number;
  downVotes?: number;
  score?: number;
}

// Upload response from POST /api/sound/upload
export interface UploadResponse {
  hash: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  tags: string[];
}
