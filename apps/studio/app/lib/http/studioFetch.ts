export async function studioWriteFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = (process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN ?? "").trim();
  headers.set("x-roseiies-studio-token", token);

  if (!token && process.env.NODE_ENV === "development") {
    // dev-only warning; server will 401 anyway
    console.warn(
      "[studioWriteFetch] Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN. Write calls will 401."
    );
  }

  return fetch(input, { ...init, headers });
}