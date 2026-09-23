import { json, methodNotAllowed, requireAuth, safeUser } from "../../../lib/auth.js";

async function handleGet({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth.response) return auth.response;
  return json({ user: safeUser(auth.user) }, 200, { "Cache-Control": "no-store" });
}

export function onRequest(context) {
  return context.request.method === "GET"
    ? handleGet(context)
    : methodNotAllowed("GET");
}
