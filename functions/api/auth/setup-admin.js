import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  json,
  methodNotAllowed,
  randomToken,
  readJsonObject,
  safeUser,
  sessionCookie,
  SESSION_SECONDS,
  sha256Base64Url,
} from "../../../lib/auth.js";

async function handlePost({ request, env }) {
  const setupSecret = env?.AUTH_SETUP_SECRET;
  const suppliedSecret = request.headers.get("X-Auth-Setup-Secret") ?? "";
  if (!setupSecret || suppliedSecret.length !== setupSecret.length) {
    return json({ error: "Not found" }, 404);
  }

  const secretMatches = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(suppliedSecret));
  const expectedMatches = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(setupSecret));
  const a = new Uint8Array(secretMatches);
  const b = new Uint8Array(expectedMatches);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  if (difference !== 0) return json({ error: "Not found" }, 404);
  if (!env?.DB) return json({ error: "Setup unavailable" }, 500);

  let body;
  try {
    body = await readJsonObject(request);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = body.password;
  const resetExisting = body.action === "reset-existing";
  if (!isValidEmail(email) || !isValidPassword(password) || (!resetExisting && (name.length < 1 || name.length > 100))) {
    return json({ error: "Provide a valid email, password of at least 12 characters, and name for initial admin setup" }, 400);
  }

  try {
    const passwordHash = await hashPassword(password);
    let user;
    if (resetExisting) {
      const existing = await env.DB.prepare(
        "SELECT id, name, email, role, avatar_url FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
      ).bind(email).first();
      if (!existing) return json({ error: "Account not found" }, 404);
      await env.DB.prepare(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(passwordHash, existing.id).run();
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(existing.id).run();
      user = existing;
    } else {
      const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE LIMIT 1").bind(email).first();
      if (exists) return json({ error: "An account with this email already exists; use reset-existing" }, 409);
      const id = randomToken(16);
      const now = new Date().toISOString();
      const insert = await env.DB.prepare(
        "INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at, updated_at) SELECT ?, ?, ?, ?, 'admin', NULL, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') AND NOT EXISTS (SELECT 1 FROM users WHERE email = ? COLLATE NOCASE)",
      ).bind(id, name, email, passwordHash, now, now, email).run();
      if (insert.meta?.changes === 0) {
        return json({ error: "Initial admin setup is already complete or the email already exists" }, 409);
      }
      user = { id, name, email, role: "admin", avatar_url: null };
    }

    const token = randomToken();
    const tokenHash = await sha256Base64Url(token);
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, datetime('now', ?), CURRENT_TIMESTAMP)",
    ).bind(randomToken(16), user.id, tokenHash, `+${SESSION_SECONDS} seconds`).run();

    return json({ user: safeUser(user) }, 201, {
      "Set-Cookie": sessionCookie(token),
      "Cache-Control": "no-store",
    });
  } catch {
    return json({ error: "Setup unavailable" }, 500);
  }
}

export function onRequest(context) {
  return context.request.method === "POST"
    ? handlePost(context)
    : methodNotAllowed("POST");
}
