import { createApp } from "../../../src/server/app";
import { prisma } from "../../../src/db/prisma";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const app = createApp(prisma);

async function withDevHeaders(request: Request): Promise<Request> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("dev_user_id")?.value;
  const organizationId = cookieStore.get("dev_organization_id")?.value;

  const cloned = request.clone();
  const headers = new Headers(cloned.headers);
  if (userId && !headers.get("x-user-id")) headers.set("x-user-id", userId);
  if (organizationId && !headers.get("x-organization-id")) headers.set("x-organization-id", organizationId);

  if (cloned.method === "GET" || cloned.method === "HEAD") return new Request(cloned.url, { headers, method: cloned.method });

  // Node fetch requires duplex when providing a body stream
  return new Request(cloned.url, {
    method: cloned.method,
    headers,
    body: cloned.body,
    // @ts-expect-error - required by Node.js undici for streaming request bodies
    duplex: "half",
  });
}

export async function GET(request: Request) {
  return app.fetch(await withDevHeaders(request));
}

export async function POST(request: Request) {
  return app.fetch(await withDevHeaders(request));
}

export async function PUT(request: Request) {
  return app.fetch(await withDevHeaders(request));
}

export async function PATCH(request: Request) {
  return app.fetch(await withDevHeaders(request));
}

export async function DELETE(request: Request) {
  return app.fetch(await withDevHeaders(request));
}


