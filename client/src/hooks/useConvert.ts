import { useState, useCallback } from "react";

type Status = "idle" | "uploading" | "done" | "error";

interface ConvertState {
  status: Status;
  objectUrl: string | null;
  filename: string | null;
  error: string | null;
}

export function useConvert() {
  const [state, setState] = useState<ConvertState>({
    status: "idle",
    objectUrl: null,
    filename: null,
    error: null,
  });

  const convert = useCallback(async (file: File) => {
    // Revoke previous object URL to free memory
    setState((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { status: "uploading", objectUrl: null, filename: file.name, error: null };
    });

    try {
      const body = new FormData();
      body.append("file", file);

      // POST the zip to our Express API
      const res = await fetch("/api/convert", { method: "POST", body });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      // The server responds with raw PDF bytes
      const blob = await res.blob();
      // createObjectURL gives a local browser URL the PDF viewer can load
      const objectUrl = URL.createObjectURL(blob);
      setState({ status: "done", objectUrl, filename: file.name, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return { status: "idle", objectUrl: null, filename: null, error: null };
    });
  }, []);

  return { ...state, convert, reset };
}
