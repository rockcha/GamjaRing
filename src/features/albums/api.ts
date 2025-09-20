import supabase from "@/lib/supabase";
import type { Album, AlbumPhoto } from "./types";

const BUCKET = "album";

export function imageUrl(path: string, w = 720, q = 80) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path, {
    transform: { width: w, quality: q, resize: "cover" as const },
  });
  return data.publicUrl;
}

export async function createAlbum(payload: {
  coupleId: string;
  title: string;
  date: string; // YYYY-MM-DD
  weather?: string; // 이모지
  photos: Array<{
    file: File;
    description?: string;
    isCover?: boolean;
  }>;
}) {
  // 1) 앨범 생성
  const { data: album, error: aerr } = await supabase
    .from("albums")
    .insert({
      couple_id: payload.coupleId,
      title: payload.title,
      date: payload.date,
      weather: payload.weather ?? null,
    })
    .select("*")
    .single();

  if (aerr || !album) throw aerr ?? new Error("앨범 생성 실패");

  // 2) 사진 업로드 & 메타 저장
  const rows: Partial<AlbumPhoto>[] = [];
  let coverSet = false;

  for (let i = 0; i < payload.photos.length; i++) {
    const p = payload.photos[i];
    const ext = (p.file.name.split(".").pop() || "jpg").toLowerCase();
    const name = String(i + 1).padStart(3, "0") + "." + ext;
    const storagePath = `albums/${album.id}/${name}`;

    const { error: uerr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, p.file, { upsert: true });
    if (uerr) throw uerr;

    const isCover = p.isCover === true;
    coverSet = coverSet || isCover;

    rows.push({
      album_id: album.id,
      couple_id: payload.coupleId,
      storage_path: storagePath,
      description: p.description ?? null,
      order: i,
      is_cover: isCover,
    });
  }

  // 2-1) 대표 미설정 시 첫 사진을 대표로
  if (!coverSet && rows.length > 0) rows[0].is_cover = true;

  if (rows.length > 0) {
    const { error: perr } = await supabase.from("album_photos").insert(rows);
    if (perr) throw perr;
  }

  return album as Album;
}

export async function listMyAlbums() {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // 대표사진 publicUrl 붙이기
  const ids = (data ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: photos } = await supabase
    .from("album_photos")
    .select("album_id, storage_path, is_cover")
    .in("album_id", ids);

  return (data ?? []).map((a) => {
    const cover = (photos ?? []).find((p) => p.album_id === a.id && p.is_cover);
    const cover_url = cover ? imageUrl(cover.storage_path, 640, 80) : "";
    return { ...a, cover_url } as Album;
  });
}

export async function getAlbum(id: string) {
  const { data: album, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !album) throw error ?? new Error("앨범 없음");

  const { data: photos } = await supabase
    .from("album_photos")
    .select("*")
    .eq("album_id", id)
    .order("order", { ascending: true });

  const enhanced = (photos ?? []).map((p) => ({
    ...p,
    publicUrl: imageUrl(p.storage_path, 1024, 85),
  }));

  return { album: album as Album, photos: enhanced as AlbumPhoto[] };
}
