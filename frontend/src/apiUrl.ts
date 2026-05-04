/** Base URL for the Express API (no trailing slash). */
export function apiUrl(path: string): string {
  const raw =
    typeof import.meta.env.VITE_API_URL === "string" &&
    import.meta.env.VITE_API_URL.length > 0
      ? import.meta.env.VITE_API_URL
      : "http://localhost:5000";
  const base = raw.replace(/\/$/, "");
  console.log(import.meta.env.VITE_API_URL);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
