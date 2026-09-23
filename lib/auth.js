const SESSION_COOKIE = "__Host-codeio_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const SESSION_DEFAULT_SECONDS = 60 * 60 * 8;
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_SCHEME = "pbkdf2-sha256";

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
  };
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToBase64Url(bytes);
}

export async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterationsText, saltText, expectedText, extra] = String(stored ?? "").split("$");
  if (scheme !== PASSWORD_SCHEME || extra !== undefined) return false;
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > PASSWORD_ITERATIONS) return false;

  let salt;
  let expected;
  try {
    salt = base64UrlToBytes(saltText);
    expected = base64UrlToBytes(expectedText);
  } catch {
    return false;
  }
  if (salt.length !== 16 || expected.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const actual = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  ));
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = new Map();
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, value);
  }
  return cookies;
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}

export async function getAuthenticatedUser(request, env) {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token || !env?.DB) return null;

  const tokenHash = await sha256Base64Url(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.name, users.email, users.role, users.avatar_url
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND julianday(sessions.expires_at) > julianday('now')
     LIMIT 1`,
  ).bind(tokenHash).first();
  return row ?? null;
}

export async function requireAuth(request, env) {
  try {
    const user = await getAuthenticatedUser(request, env);
    return user ? { user } : { response: json({ error: "Authentication required" }, 401) };
  } catch {
    return { response: json({ error: "Authentication unavailable" }, 500) };
  }
}

export async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.response) return auth;
  if (auth.user.role !== "admin") {
    return { response: json({ error: "Forbidden" }, 403) };
  }
  return auth;
}

export function readJsonObject(request) {
  return request.json().then((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON body");
    return value;
  });
}

export function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 1024;
}

export function methodNotAllowed(allowed) {
  return json({ error: "Method not allowed" }, 405, { Allow: allowed });
}

export { SESSION_COOKIE, SESSION_SECONDS, SESSION_DEFAULT_SECONDS, json };
