import AdmZip from "adm-zip";
import path from "path";

export interface ZipContents {
  markdownSource: string;
  markdownFilename: string;
  assets: Map<string, Buffer>;
}

export function extractZip(zipPath: string): ZipContents {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  // Build raw asset map: entryName → Buffer
  const raw = new Map<string, Buffer>();
  for (const entry of entries) {
    raw.set(entry.entryName, entry.getData());
  }

  // Strip the common path prefix so a zip like "project/README.md" +
  // "project/images/foo.png" has keys "README.md" and "images/foo.png".
  const prefix = commonPrefix(Array.from(raw.keys()));
  const assets = new Map<string, Buffer>();
  for (const [key, buf] of raw) {
    assets.set(key.slice(prefix.length), buf);
  }

  // Pick the markdown file: prefer README.md at the shallowest depth,
  // then any .md file at the shallowest depth.
  const mdKeys = Array.from(assets.keys()).filter((k) =>
    k.toLowerCase().endsWith(".md")
  );
  if (mdKeys.length === 0) {
    throw new Error("No .md file found in ZIP");
  }

  const chosen =
    mdKeys.find(
      (k) => path.basename(k).toLowerCase() === "readme.md" && !k.includes("/")
    ) ??
    mdKeys.reduce((a, b) =>
      depth(a) <= depth(b) ? a : b
    );

  const markdownSource = assets.get(chosen)!.toString("utf-8");
  assets.delete(chosen);

  return { markdownSource, markdownFilename: chosen, assets };
}

function depth(p: string): number {
  return p.split("/").length - 1;
}

function commonPrefix(paths: string[]): string {
  if (paths.length === 0) return "";
  // Work with directory parts only (don't strip filename segments)
  const dirs = paths.map((p) => {
    const parts = p.split("/");
    return parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
  });
  let prefix = dirs[0];
  for (const d of dirs.slice(1)) {
    while (!d.startsWith(prefix)) {
      prefix = prefix.slice(0, prefix.lastIndexOf("/", prefix.length - 2) + 1);
      if (prefix === "") return "";
    }
  }
  // Only strip the prefix if ALL files share it (i.e. there's a single root folder)
  const topLevelDirs = new Set(
    paths.map((p) => p.split("/")[0])
  );
  if (topLevelDirs.size === 1 && paths.every((p) => p.includes("/"))) {
    const rootFolder = Array.from(topLevelDirs)[0] + "/";
    return rootFolder;
  }
  return "";
}
