import {
  clearSessionCookie,
  json,
  methodNotAllowed,
  parseCookies,
  SESSION_COOKIE,
  sha256Base64Url,
} from "../../../lib/auth.js";

async function handlePost({ request, env }) {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (token && env?.DB) {
    try {
      const tokenHash = await sha256Base64Url(token);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    } catch {
      return json({ error: "Logout unavailable" }, 500, {
        "Set-Cookie": clearSessionCookie(),
        "Cache-Control": "no-store",
      });
    }
  }

  return json({ ok: true }, 200, {
    "Set-Cookie": clearSessionCookie(),
    "Cache-Control": "no-store",
  });
}

export function onRequest(context) {
  return context.request.method === "POST"
    ? handlePost(context)
    : methodNotAllowed("POST");
}
