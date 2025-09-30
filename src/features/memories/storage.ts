// src/features/memories/storage.ts
import supabase from "@/lib/supabase";

const BUCKET = "memories";

/** 버킷 내부 public 파일 URL */
export function publicUrl(path: string) {
  return `${
    import.meta.env.VITE_SUPABASE_URL
  }/storage/v1/object/public/${BUCKET}/${path}`;
}

/** 이미지 업로드(충돌 방지, upsert=false) */
export async function uploadMemoryImage(opts: {
  coupleId: string;
  fragmentId: string;
  file: File;
}) {
  const ext = (opts.file.name.split(".").pop() || "png").toLowerCase();
  const path = `${opts.coupleId}/${
    opts.fragmentId
  }/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, opts.file, { upsert: false });

  if (error) throw error;

  return { path, url: publicUrl(path) };
}

/** ✅ 실제 파일 삭제 */
export async function removeMemoryImage(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
