export type Fragment = {
  id: string;
  couple_id: string;
  author_id: string | null;
  title: string;
  event_date: string; // yyyy-mm-dd
  cover_photo_path: string | null; // storage path (memories/<...>)
  hearts: number;
  created_at: string;
  updated_at: string;
};

export type MemoryCard = {
  id: string;
  fragment_id: string;
  couple_id: string;
  author_id: string | null;
  image_path: string; // storage path
  layout: "photo-left" | "photo-right";
  caption_author: string | null;
  caption_partner: string | null;
  order_index: number;
  created_at: string;
};

export type Summary = {
  id: string;
  fragment_id: string;
  content: string;
  created_at: string;
};
