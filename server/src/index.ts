import express from "express";
import cors from "cors";
import path from "path";
import convertRouter from "./routes/convert";
import { getBrowser } from "./services/pdfGenerator";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? "*" }));
app.use("/api", convertRouter);

// In production, serve the built React app from client/dist
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Warm up Puppeteer on startup to avoid first-request latency
  try {
    await getBrowser();
    console.log("Puppeteer browser ready");
  } catch (e) {
    console.error("Puppeteer failed to start:", e);
  }
});
