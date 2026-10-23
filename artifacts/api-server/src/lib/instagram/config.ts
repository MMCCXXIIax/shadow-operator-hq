// Server-side view of the Instagram integration's configuration.
//
// This reports only whether each required variable is PRESENT. Values are never
// read into a response, logged or sent to the browser — the operator needs to
// know what is missing, not what the secret is.
export const META_CONFIG_FIELDS = [
  {
    name: "META_APP_ID",
    description: "Meta app id for the Facebook Login flow that issues the access token.",
  },
  {
    name: "META_APP_SECRET",
    description: "Meta app secret. Server-side only; never reaches the browser.",
  },
  {
    name: "META_REDIRECT_URI",
    description: "Exact HTTPS callback registered on the Meta app, on a stable domain.",
  },
] as const;

export type InstagramConfigField = (typeof META_CONFIG_FIELDS)[number]["name"];

export interface InstagramConfigStatus {
  configured: boolean;
  checks: Array<{ name: InstagramConfigField; present: boolean; description: string }>;
  graphApiVersion: string;
  commentAccess: "unsupported" | "own_account_only";
  commentAccessNote: string;
  nextStep: string;
}

export function instagramConfigStatus(): InstagramConfigStatus {
  const checks = META_CONFIG_FIELDS.map((field) => ({
    name: field.name,
    present: Boolean(process.env[field.name]?.trim()),
    description: field.description,
  }));

  return {
    configured: checks.every((check) => check.present),
    checks,
    graphApiVersion: process.env.META_GRAPH_VERSION?.trim() || "v23.0",
    // Stated up front so no report later implies it observed audience comments.
    commentAccess: "own_account_only",
    commentAccessNote:
      "Business Discovery returns captions and like/comment counts only. Comment text is available solely for media owned by the account that issued the token.",
    nextStep:
      "Register the Facebook Login callback on a stable HTTPS domain, obtain Advanced Access for instagram_basic and instagram_manage_insights, then store the app id, secret and redirect URI as server-side secrets.",
  };
}
