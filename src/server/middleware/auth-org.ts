import type { MiddlewareHandler } from "hono";
import { createScopedDb } from "../scoped-db";
import { jsonError } from "../errors";
import type { PrismaLike } from "../types";

export interface AuthOrgEnv {
  Variables: {
    userId: string;
    organizationId: string;
    orgRole: "owner" | "member" | "viewer";
    db: ReturnType<typeof createScopedDb>;
    prisma: PrismaLike;
  };
}

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  if (!token) return null;
  return token;
}

export function authOrgMiddleware(prisma: PrismaLike): MiddlewareHandler<AuthOrgEnv> {
  return async (c, next) => {
    const userId =
      c.req.header("x-user-id") ??
      getBearerToken(c.req.header("authorization")) ??
      null;

    if (!userId) return jsonError(c, 401, "unauthorized", "Missing authentication.");

    const requestedOrgId = c.req.header("x-organization-id") ?? null;
    const activeMemberships = await prisma.organizationMembership.findMany({
      where: { userId, status: "active" },
    });

    const singleMembershipOrgId =
      activeMemberships.length === 1 && typeof (activeMemberships[0] as any)?.organizationId === "string"
        ? String((activeMemberships[0] as any).organizationId)
        : null;

    const resolvedOrgId =
      requestedOrgId ??
      singleMembershipOrgId;

    if (!resolvedOrgId)
      return jsonError(
        c,
        400,
        "missing_organization",
        "Missing current organization. Provide x-organization-id header.",
        { header: "x-organization-id" },
      );

    const membership = await prisma.organizationMembership.findFirst({
      where: { userId, organizationId: resolvedOrgId, status: "active" },
    });

    if (!membership)
      return jsonError(c, 403, "forbidden", "You do not have access to this organization.");

    c.set("userId", userId);
    c.set("organizationId", resolvedOrgId);
    c.set("orgRole", (membership.role ?? "member") as "owner" | "member" | "viewer");
    c.set("prisma", prisma);
    c.set("db", createScopedDb(prisma, resolvedOrgId));

    await next();
  };
}


