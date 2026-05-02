import path from "path";

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

// Matches src="..." inside any <img> tag
const IMG_SRC_RE = /(<img\b[^>]*?\bsrc=")([^"]+)(")/gi;

export function embedImages(
  html: string,
  assets: Map<string, Buffer>
): string {
  return html.replace(IMG_SRC_RE, (match, pre, src, suf) => {
    // Skip data URIs and absolute URLs — they're already resolved
    if (src.startsWith("data:") || src.startsWith("http")) return match;

    // Normalize: strip leading "./" or "/"
    const key = src.replace(/^\.?\//, "");
    const buf = assets.get(key);
    if (!buf) return match;

    const ext = path.extname(key).slice(1).toLowerCase();
    const mime = MIME_MAP[ext] ?? "application/octet-stream";
    return `${pre}data:${mime};base64,${buf.toString("base64")}${suf}`;
  });
}
