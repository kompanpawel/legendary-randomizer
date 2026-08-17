
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block border-2 border-marvel-red border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Ładowanie..."
    />
  );
}

