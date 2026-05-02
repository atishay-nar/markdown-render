interface Props {
  status: "uploading" | "error";
  filename: string | null;
  error: string | null;
}

export function StatusBanner({ status, filename, error }: Props) {
  if (status === "uploading") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4 max-w-lg mx-auto">
        <svg className="animate-spin w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-blue-700 text-sm">
          Converting <span className="font-semibold">{filename}</span>…
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4 max-w-lg mx-auto">
      <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7a.75.75 0 100-1.5.75.75 0 000 1.5z"
          clipRule="evenodd" />
      </svg>
      <p className="text-red-700 text-sm">
        <span className="font-semibold">Error: </span>{error}
      </p>
    </div>
  );
}
