import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";

// Browser singleton — launched once, reused across all requests.
// Avoids the 1-3 second Chromium cold-start cost per conversion.
let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // /dev/shm is 64MB in Docker; use /tmp instead
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
      ],
    });
  }
  return browser;
}

function loadCss(pkgPath: string): string {
  try {
    return fs.readFileSync(require.resolve(pkgPath), "utf-8");
  } catch {
    return "";
  }
}

const githubCss = loadCss("github-markdown-css/github-markdown-light.css");
const hljsCss = loadCss("highlight.js/styles/github.css");

export async function generatePdf(embeddedHtml: string): Promise<Buffer> {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${githubCss}</style>
  <style>${hljsCss}</style>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      padding: 40px 48px;
      max-width: 960px;
      margin: 0 auto;
      color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    pre { page-break-inside: avoid; }
    table { page-break-inside: avoid; border-collapse: collapse; width: 100%; }
    img { max-width: 100%; height: auto; }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    /* Task list checkboxes */
    .task-list-item { list-style: none; }
    .task-list-item input[type="checkbox"] { margin-right: 6px; }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${embeddedHtml}
  </article>
</body>
</html>`;

  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true, // required: renders code block background colors
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
