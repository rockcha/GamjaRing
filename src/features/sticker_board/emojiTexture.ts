export function renderEmojiToImage(emoji: string, size = 80): HTMLImageElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(
    size * 0.48
  )}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Noto Emoji",sans-serif`;
  ctx.fillText(emoji, size / 2, size / 2);
  const img = new Image();
  img.src = c.toDataURL("image/png");
  return img;
}
