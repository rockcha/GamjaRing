export const AVATAR_COUNT = 25;
export const AVATAR_IDS = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);

export function avatarSrc(id?: number | null) {
  if (!id) return null;
  // public 디렉토리에 배치했다면 "/assets/..." 로 접근
  // (Next.js: /public/assets/avatar1.png → /assets/avatar1.png)
  return `/assets/avatar${id}.png`;
}
