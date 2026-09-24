import {
  SESSION_SECONDS,
  SESSION_DEFAULT_SECONDS,
  isValidEmail,
  json,
  methodNotAllowed,
  randomToken,
  readJsonObject,
  safeUser,
  sessionCookie,
  sha256Base64Url,
  verifyPassword,
} from "../../../lib/auth.js";

const DUMMY_PASSWORD_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function handlePost({ request, env }) {
  if (!env?.DB) return json({ error: "Authentication unavailable" }, 500);

  let body;
  try {
    body = await readJsonObject(request);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email) || password.length < 1 || password.length > 1024) {
    return json({ error: "Invalid email or password" }, 400);
  }

  try {
    const user = await env.DB.prepare(
      "SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
    ).bind(email).first();

    const passwordValid = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordValid) {
      return json({ error: "Invalid email or password" }, 401);
    }

    const token = randomToken();
    const tokenHash = await sha256Base64Url(token);
    const sessionId = randomToken(16);
    const sessionSeconds = body.remember === true ? SESSION_SECONDS : SESSION_DEFAULT_SECONDS;
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, datetime('now', ?), CURRENT_TIMESTAMP)",
    ).bind(sessionId, user.id, tokenHash, `+${sessionSeconds} seconds`).run();

    return json({ user: safeUser(user) }, 200, {
      "Set-Cookie": sessionCookie(token, sessionSeconds),
      "Cache-Control": "no-store",
    });
  } catch {
    return json({ error: "Authentication unavailable" }, 500);
  }
}

export function onRequest(context) {
  return context.request.method === "POST"
    ? handlePost(context)
    : methodNotAllowed("POST");
}
