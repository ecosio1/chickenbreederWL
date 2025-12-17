import { describe, expect, it } from "vitest";
import { createApp } from "./app";

function makePrismaWithRole(role: "owner" | "member" | "viewer") {
  const orgId = "00000000-0000-0000-0000-000000000101";
  const userId = "00000000-0000-0000-0000-000000000001";

  return {
    organizationMembership: {
      async findMany() {
        return [{ organizationId: orgId, userId, status: "active", role }];
      },
      async findFirst() {
        return { id: "m1", role };
      },
      async create() {
        return { id: "m2" };
      },
      async update() {
        return { id: "m1", role: "viewer" };
      },
      async delete() {
        return { id: "m1" };
      },
    },
    user: {
      async findUnique() {
        return { id: userId };
      },
      async create() {
        return { id: "u2" };
      },
    },
    chicken: {
      async findFirst() {
        return null;
      },
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
      async create() {
        return { id: "c1" };
      },
      async update() {
        return { id: "c1" };
      },
    },
    breedingEvent: {
      async findFirst() {
        return null;
      },
      async findMany() {
        return [];
      },
      async create() {
        return { id: "b1" };
      },
      async update() {
        return { id: "b1" };
      },
    },
  };
}

function headers() {
  return {
    "x-user-id": "00000000-0000-0000-0000-000000000001",
    "x-organization-id": "00000000-0000-0000-0000-000000000101",
  };
}

describe("RBAC (org roles)", () => {
  it("viewer cannot create/edit/delete (write requests are blocked)", async () => {
    const app = createApp(makePrismaWithRole("viewer") as any);

    const post = await app.request("http://test/chickens", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({
        visual_id_type: "leg_band",
        visual_id_color: "red",
        visual_id_number: "0142",
        breed_primary: "Plymouth Rock",
        sex: "hen",
      }),
    });
    expect(post.status).toBe(403);

    const patch = await app.request("http://test/chickens/c1", {
      method: "PATCH",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({ status: "sold" }),
    });
    expect(patch.status).toBe(403);

    const del = await app.request("http://test/chickens/c1", { method: "DELETE", headers: headers() });
    expect(del.status).toBe(403);
  });

  it("member can write but cannot manage members", async () => {
    const app = createApp(makePrismaWithRole("member") as any);

    const post = await app.request("http://test/chickens", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({
        visual_id_type: "leg_band",
        visual_id_color: "red",
        visual_id_number: "0142",
        breed_primary: "Plymouth Rock",
        sex: "hen",
      }),
    });
    expect(post.status).not.toBe(403);

    const members = await app.request("http://test/org/members", { method: "GET", headers: headers() });
    expect(members.status).toBe(403);
  });

  it("owner can manage members", async () => {
    const app = createApp(makePrismaWithRole("owner") as any);

    const members = await app.request("http://test/org/members", { method: "GET", headers: headers() });
    expect(members.status).toBe(200);

    const add = await app.request("http://test/org/members", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({ email: "viewer@acme.test", role: "viewer" }),
    });
    expect(add.status).toBe(201);
  });
});


