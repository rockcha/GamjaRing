// src/features/memories/storage.ts
import supabase from "@/lib/supabase";

const BUCKET = "memories";
const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

function extensionFromFile(file: File) {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/avif") return "avif";
  return (file.name.split(".").pop() || "png").toLowerCase();
}

async function compressMemoryImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

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
  const file = await compressMemoryImage(opts.file);
  const ext = extensionFromFile(file);
  const path = `${opts.coupleId}/${
    opts.fragmentId
  }/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: false,
      cacheControl: "31536000",
      contentType: file.type || undefined,
    });

  if (error) throw error;

  return { path, url: publicUrl(path) };
}

/** ✅ 실제 파일 삭제 */
export async function removeMemoryImage(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
