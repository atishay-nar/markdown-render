import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const PRESETS = [
  { value: 0.5,  label: "50%"  },
  { value: 0.75, label: "75%"  },
  { value: 1,    label: "Fit"  },
  { value: 1.25, label: "125%" },
  { value: 1.5,  label: "150%" },
  { value: 2,    label: "200%" },
];

interface Props {
  objectUrl: string;
  filename: string | null;
  onReset: () => void;
}

export function PdfViewer({ objectUrl, filename, onReset }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState("");

  const containerRef    = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Refs that the gesture handler reads without needing re-subscription
  const zoomRef        = useRef(zoom);       // last committed zoom
  const visualZoomRef  = useRef(zoom);       // in-flight zoom (no re-renders)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for keyboard handler (avoids re-attaching listener on every page change)
  const currentPageRef = useRef(currentPage);
  const numPagesRef    = useRef(numPages);

  // Keep refs in sync with state; clear the CSS transform when zoom commits
  // so the wrapper is back to scale(1) before react-pdf re-rasterises.
  useEffect(() => {
    zoomRef.current = zoom;
    visualZoomRef.current = zoom;
    if (scaleWrapperRef.current) scaleWrapperRef.current.style.transform = "";
  }, [zoom]);

  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { numPagesRef.current    = numPages;    }, [numPages]);

  // Measure scroll-container width for page sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Scroll tracker
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    function handleScroll() {
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const mid   = cRect.top + container.clientHeight / 2;
      let closest = 0, closestDist = Infinity;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < closestDist) { closestDist = d; closest = i; }
      }
      setCurrentPage(closest + 1);
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  // ─── Zoom gesture handler ────────────────────────────────────────────────
  // Core idea: during a pinch/wheel gesture we only mutate the DOM transform
  // (no React state update → no re-render → no blink).  When the gesture ends
  // we fire setZoom once, React re-rasters the pages at the new size, and we
  // clear the transform — one clean redraw instead of dozens.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function applyVisual(newZoom: number) {
      const clamped = Math.min(2.5, Math.max(0.25, newZoom));
      visualZoomRef.current = clamped;
      // CSS scale = desired visual size / current rasterised size
      if (scaleWrapperRef.current)
        scaleWrapperRef.current.style.transform = `scale(${clamped / zoomRef.current})`;
    }

    function commit() {
      setZoom(visualZoomRef.current);
      // transform is cleared by the zoom useEffect above after setZoom resolves
    }

    // Trackpad pinch / Ctrl+scroll ──────────────────────────────────────────
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyVisual(visualZoomRef.current * (1 - e.deltaY * 0.005));
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      // Commit 200 ms after the last wheel event (gesture is "done")
      commitTimerRef.current = setTimeout(commit, 200);
    }

    // Touchscreen two-finger pinch ──────────────────────────────────────────
    const pinch = { active: false, startDist: 0, startZoom: 1 };

    function fingerDist(t: TouchList) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      pinch.active    = true;
      pinch.startDist = fingerDist(e.touches);
      pinch.startZoom = zoomRef.current;
      visualZoomRef.current = zoomRef.current;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pinch.active || e.touches.length !== 2) return;
      e.preventDefault();
      applyVisual(pinch.startZoom * (fingerDist(e.touches) / pinch.startDist));
    }

    function onTouchEnd() {
      if (!pinch.active) return;
      pinch.active = false;
      commit(); // commit immediately when fingers lift
    }

    el.addEventListener("wheel",      onWheel,      { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true  });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);
    return () => {
      el.removeEventListener("wheel",      onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []); // runs once — all mutable state is via refs

  const scrollToPage = useCallback((n: number) => {
    const el = pageRefs.current[n - 1];
    const container = containerRef.current;
    if (!el || !container) return;
    const elTop = el.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + elTop - containerTop, behavior: "smooth" });
  }, []);

  const commitPageInput = useCallback(() => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) scrollToPage(n);
    setEditingPage(false);
  }, [pageInput, numPages, scrollToPage]);

  // Keyboard shortcuts — runs once; reads page state via refs
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        scrollToPage(Math.max(1, currentPageRef.current - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        scrollToPage(Math.min(numPagesRef.current, currentPageRef.current + 1));
      } else if (e.key === "+" || e.key === "=") {
        setZoom(z => Math.min(2.5, Math.round((z + 0.25) * 100) / 100));
      } else if (e.key === "-") {
        setZoom(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100));
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToPage]);

  const pageWidth = Math.min(containerWidth - 32, 900) * zoom;
  const isPreset  = PRESETS.some(p => p.value === zoom);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
          </svg>
          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
            {filename?.replace(/\.zip$/i, ".pdf") ?? "output.pdf"}
          </span>
          <span className="text-xs text-gray-400">
            ({numPages} {numPages === 1 ? "page" : "pages"})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {editingPage ? (
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageInput}
                autoFocus
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitPageInput();
                  else if (e.key === "Escape") setEditingPage(false);
                }}
                onBlur={commitPageInput}
                className="text-sm text-gray-700 border border-blue-400 rounded px-1 w-16 text-center focus:outline-none"
              />
            ) : (
              <span
                className="text-sm text-gray-600 w-20 text-center cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                title="Click to jump to page"
                onClick={() => { setPageInput(String(currentPage)); setEditingPage(true); }}
              >
                {currentPage} / {numPages || "—"}
              </span>
            )}
            <button
              onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 font-bold text-sm leading-none"
              aria-label="Zoom out"
            >−</button>

            {/* Preset dropdown — shows current % if between presets */}
            <select
              value={isPreset ? zoom : "custom"}
              onChange={e => {
                if (e.target.value !== "custom") setZoom(Number(e.target.value));
              }}
              className="text-sm text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer hover:border-gray-300 focus:outline-none"
              aria-label="Zoom level"
            >
              {!isPreset && (
                <option value="custom">{Math.round(zoom * 100)}%</option>
              )}
              {PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <button
              onClick={() => setZoom(z => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 font-bold text-sm leading-none"
              aria-label="Zoom in"
            >+</button>
          </div>

          {/* Download */}
          <a
            href={objectUrl}
            download={filename?.replace(/\.zip$/i, ".pdf") ?? "output.pdf"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0-3-3m3 3 3-3M12 3v9" />
            </svg>
            Download
          </a>

          {/* Convert another */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            New file
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0, background: "#6b7280", touchAction: "pan-y" }}
      >
        {/* scaleWrapper: only this div gets the CSS transform during gestures.
            transform-origin: top center keeps the top of the document anchored
            so zooming feels natural while reading. */}
        <div ref={scaleWrapperRef} style={{ transformOrigin: "top center" }}>
          <Document
            file={objectUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setCurrentPage(1);
              pageRefs.current = new Array(numPages).fill(null);
            }}
            loading={<div className="flex justify-center pt-20 text-white text-sm">Loading PDF…</div>}
            error={<div className="flex justify-center pt-20 text-red-300 text-sm">Failed to load PDF</div>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                ref={el => { pageRefs.current[i] = el; }}
                className="flex justify-center"
                style={{ paddingTop: 8 }}
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderAnnotationLayer
                  renderTextLayer
                />
              </div>
            ))}
            <div style={{ height: 8 }} />
          </Document>
        </div>
      </div>
    </div>
  );
}
