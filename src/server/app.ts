import { Hono } from "hono";
import { authOrgMiddleware } from "./middleware/auth-org";
import { requireOrgWriteAccess } from "./middleware/rbac";
import type { PrismaLike } from "./types";
import { chickensRoute } from "./routes/chickens";
import { breedingEventsRoute } from "./routes/breeding-events";
import { importChickensRoute } from "./routes/import-chickens";
import { exportsRoute } from "./routes/exports";
import { orgMembersRoute } from "./routes/org-members";
import { jsonError } from "./errors";

export function createApp(prisma: PrismaLike) {
  const app = new Hono();

  app.use("*", authOrgMiddleware(prisma));
  app.use("*", requireOrgWriteAccess());
  app.route("/", chickensRoute);
  app.route("/", breedingEventsRoute);
  app.route("/", importChickensRoute);
  app.route("/", exportsRoute);
  app.route("/", orgMembersRoute);

  app.notFound((c) => jsonError(c, 404, "not_found", "Route not found."));

  return app;
}


