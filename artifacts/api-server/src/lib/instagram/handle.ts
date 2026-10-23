// Turns whatever the operator typed into one canonical Instagram username.
//
// The only accepted inputs are a handle (`@creator`, `creator`) or a profile
// URL (`https://www.instagram.com/creator/?hl=en`). Anything else is rejected
// rather than guessed at, because a wrong handle would research the wrong person.
const RESERVED_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "explore",
  "accounts",
  "stories",
  "tv",
  "direct",
  "about",
  "developer",
  "legal",
  "api",
  "web",
]);

const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

export function normalizeInstagramHandle(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  // Drop a query string or fragment before anything else, so `?hl=en` does not
  // end up in the username.
  value = value.split(/[?#]/)[0];
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^(?:www\.|m\.)/, "");

  if (value.startsWith("instagram.com/")) {
    value = value.slice("instagram.com/".length);
  } else if (value.includes("/")) {
    // Some other host (or a bare path) is not an Instagram profile reference.
    return null;
  }

  value = value.replace(/^@/, "");
  // A URL may carry a trailing path segment; the first one is the username.
  value = value.split("/")[0].trim();

  if (!HANDLE_PATTERN.test(value)) return null;
  if (!/[a-z0-9]/.test(value)) return null;
  if (RESERVED_PATHS.has(value)) return null;

  return value;
}
