export type Album = {
  id: string;
  couple_id: string;
  title: string;
  date: string; // ISO (YYYY-MM-DD)
  weather?: string; // 이모지
  author_id: string;
  created_at: string;
  cover_url?: string; // 프론트 계산용
};

export type AlbumPhoto = {
  id: string;
  album_id: string;
  couple_id: string;
  storage_path: string;
  description?: string;
  order: number;
  is_cover: boolean;
  created_at: string;
  publicUrl?: string; // 프론트 계산용
};
