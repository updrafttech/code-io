import {
  SESSION_DEFAULT_SECONDS,
  hashPassword,
  isValidEmail,
  isValidPassword,
  json,
  methodNotAllowed,
  randomToken,
  readJsonObject,
  safeUser,
  sessionCookie,
  sha256Base64Url,
} from "../../../lib/auth.js";

async function handlePost({ request, env }) {
  if (!env?.DB) return json({ error: "Signup unavailable" }, 500);

  let body;
  try {
    body = await readJsonObject(request);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  if (name.length < 1 || name.length > 100 || !isValidEmail(email) || !isValidPassword(password)) {
    return json({ error: "Enter a valid name, email, and password of at least 12 characters" }, 400);
  }

  try {
    const passwordHash = await hashPassword(password);
    const id = randomToken(16);
    const now = new Date().toISOString();
    const insert = await env.DB.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, 'user', NULL, ?, ?) ON CONFLICT(email) DO NOTHING",
    ).bind(id, name, email, passwordHash, now, now).run();
    if (insert.meta?.changes === 0) {
      return json({ error: "Unable to create account with these details" }, 409);
    }

    const token = randomToken();
    const tokenHash = await sha256Base64Url(token);
    const sessionId = randomToken(16);
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, datetime('now', ?), CURRENT_TIMESTAMP)",
    ).bind(sessionId, id, tokenHash, `+${SESSION_DEFAULT_SECONDS} seconds`).run();

    const user = { id, name, email, role: "user", avatar_url: null };
    return json({ user: safeUser(user) }, 201, {
      "Set-Cookie": sessionCookie(token, SESSION_DEFAULT_SECONDS),
      "Cache-Control": "no-store",
    });
  } catch {
    return json({ error: "Signup unavailable" }, 500);
  }
}

export function onRequest(context) {
  return context.request.method === "POST"
    ? handlePost(context)
    : methodNotAllowed("POST");
}
