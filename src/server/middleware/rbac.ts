import type { MiddlewareHandler } from "hono";
import type { AuthOrgEnv } from "./auth-org";
import { jsonError } from "../errors";

function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

export function requireOrgWriteAccess(): MiddlewareHandler<AuthOrgEnv> {
  return async (c, next) => {
    if (!isWriteMethod(c.req.method)) return next();
    const role = c.get("orgRole");
    if (role === "viewer") return jsonError(c, 403, "forbidden", "Viewer role is read-only.");
    return next();
  };
}

export function requireOrgOwner(): MiddlewareHandler<AuthOrgEnv> {
  return async (c, next) => {
    const role = c.get("orgRole");
    if (role !== "owner") return jsonError(c, 403, "forbidden", "Owner role required.");
    return next();
  };
}


