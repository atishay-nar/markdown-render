import { useConvert } from "./hooks/useConvert";
import { UploadZone } from "./components/UploadZone";
import { StatusBanner } from "./components/StatusBanner";
import { PdfViewer } from "./components/PdfViewer";

export default function App() {
  const { status, objectUrl, filename, error, convert, reset } = useConvert();

  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }} className="bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-lg font-semibold text-gray-800">Markdown → PDF</span>
        </div>
        <span className="text-xs text-gray-400 ml-1">Upload a ZIP, get a PDF</span>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {status === "done" && objectUrl ? (
          <PdfViewer objectUrl={objectUrl} filename={filename} onReset={reset} />
        ) : (
          // Upload + status area
          <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 py-16">
            <div className="text-center mb-2">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Convert Markdown to PDF
              </h1>
              <p className="text-gray-500 max-w-sm">
                Upload a <strong>.zip</strong> containing a Markdown file and any
                images it references. We'll render it to a polished PDF — server-side,
                no print dialog.
              </p>
            </div>

            <UploadZone onFile={convert} disabled={status === "uploading"} />

            {(status === "uploading" || status === "error") && (
              <StatusBanner status={status} filename={filename} error={error} />
            )}

            {status === "error" && (
              <button
                onClick={reset}
                className="text-sm text-blue-600 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
