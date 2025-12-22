// Backend Tag interface (matches API response from /api/tag)
export interface Tag {
  id: number;
  name: string;
  color: string;
  isPinned: boolean;
  soundCount?: number;
}
