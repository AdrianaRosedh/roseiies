export function studioWriteFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set(
    "x-roseiies-studio-token",
    process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN ?? ""
  );
  return fetch(input, { ...init, headers });
}
