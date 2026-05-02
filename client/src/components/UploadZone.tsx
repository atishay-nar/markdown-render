import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center gap-3",
        "w-full max-w-lg mx-auto rounded-2xl border-2 border-dashed",
        "px-8 py-14 transition-colors cursor-pointer select-none",
        disabled
          ? "opacity-50 cursor-not-allowed border-gray-300"
          : dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50",
      ].join(" ")}
    >
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 16v-8m0 0-3 3m3-3 3 3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <p className="text-gray-600 font-medium text-lg">
        {dragging ? "Drop your file here" : "Drag & drop a file"}
      </p>
      <p className="text-gray-400 text-sm">or click to browse</p>
      <p className="text-gray-400 text-xs mt-1">
        A <code className="bg-gray-100 px-1 rounded">.md</code> file, or a{" "}
        <code className="bg-gray-100 px-1 rounded">.zip</code> containing a Markdown file and images
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.md,application/zip,text/markdown,text/plain"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
