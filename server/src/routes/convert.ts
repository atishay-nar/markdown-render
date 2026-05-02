import { Router, Request, Response } from "express";
import multer from "multer";
import os from "os";
import fs from "fs";
import { extractZip } from "../services/zipExtractor";
import { renderMarkdown } from "../services/markdownRenderer";
import { embedImages } from "../services/imageEmbedder";
import { generatePdf } from "../services/pdfGenerator";

const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap
});

router.post(
  "/convert",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const tempPath = req.file?.path;

    if (!tempPath) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const originalName = req.file!.originalname;
      const isMd = originalName.toLowerCase().endsWith(".md");

      let markdownSource: string;
      let pdfFilename: string;
      let assets: Map<string, Buffer>;

      if (isMd) {
        // Bare .md file — read directly, no assets
        markdownSource = fs.readFileSync(tempPath, "utf-8");
        pdfFilename    = originalName.replace(/\.md$/i, ".pdf");
        assets         = new Map();
      } else {
        // ZIP flow — extract and locate .md + assets
        const zip = extractZip(tempPath);
        markdownSource = zip.markdownSource;
        pdfFilename    = zip.markdownFilename.replace(/\.md$/i, ".pdf");
        assets         = zip.assets;
      }

      // Markdown → HTML (GFM + syntax highlighting + task lists)
      const rawHtml = renderMarkdown(markdownSource);

      // Replace <img src="..."> with base64 data URIs so Puppeteer
      // can render images without filesystem access
      const embeddedHtml = embedImages(rawHtml, assets);

      // Render HTML → PDF via headless Chromium (NOT window.print())
      const pdfBuffer = await generatePdf(embeddedHtml);

      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", `inline; filename="${pdfFilename}"`);
      res.send(pdfBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No .md file") ? 400 : 500;
      res.status(status).json({ error: message });
    } finally {
      // Always clean up the temp ZIP file
      if (tempPath) {
        fs.unlink(tempPath, () => {});
      }
    }
  }
);

export default router;
