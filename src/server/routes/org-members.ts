import { Hono } from "hono";
import { z } from "zod";
import type { AuthOrgEnv } from "../middleware/auth-org";
import { requireOrgOwner } from "../middleware/rbac";
import { jsonError } from "../errors";

const RoleSchema = z.enum(["owner", "member", "viewer"]);

export const orgMembersRoute = new Hono<AuthOrgEnv>()
  .use("/org/members", requireOrgOwner())
  .use("/org/members/*", requireOrgOwner())
  .get("/org/members", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: true },
    });

    const items = memberships.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      email: m.user?.email ?? null,
      name: m.user?.name ?? null,
      role: m.role,
      status: m.status,
    }));

    return c.json({ items });
  })
  .post("/org/members", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        email: z.string().email(),
        role: RoleSchema.default("member"),
      })
      .strict()
      .safeParse(body);

    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", parsed.error.issues);

    if (!prisma.user.create || !prisma.organizationMembership.create)
      return jsonError(c, 500, "not_implemented", "Membership creation is not available in this environment.");

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: { email: parsed.data.email },
      }));

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: (user as any).id,
        role: parsed.data.role,
        status: "active",
      },
    });

    return c.json({ id: (membership as any).id }, 201);
  })
  .patch("/org/members/:userId", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const userId = c.req.param("userId");

    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        role: RoleSchema,
      })
      .strict()
      .safeParse(body);

    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", parsed.error.issues);

    if (!prisma.organizationMembership.update)
      return jsonError(c, 500, "not_implemented", "Membership update is not available in this environment.");

    const updated = await prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { role: parsed.data.role },
    });

    return c.json(updated);
  })
  .delete("/org/members/:userId", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const userId = c.req.param("userId");

    if (!prisma.organizationMembership.delete)
      return jsonError(c, 500, "not_implemented", "Membership delete is not available in this environment.");

    const deleted = await prisma.organizationMembership.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });

    return c.json(deleted);
  });


