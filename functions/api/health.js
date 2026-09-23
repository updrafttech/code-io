export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405, headers: { Allow: "GET" } },
    );
  }

  try {
    if (!env?.DB) {
      throw new Error("D1 binding DB is unavailable");
    }

    await env.DB.prepare("SELECT 1 AS ok").first();

    return Response.json({
      ok: true,
      database: true,
      message: "API and D1 connection working",
    });
  } catch (error) {
    console.error("Health check D1 query failed", error);
    return Response.json(
      {
        ok: false,
        error: "Health check unavailable",
      },
      { status: 500 },
    );
  }
}
