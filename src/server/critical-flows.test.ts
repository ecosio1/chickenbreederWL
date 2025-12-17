import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createMemoryPrisma } from "./test/memory-prisma";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { LineageTree } from "../features/chickens/lineage-tree";

const ORG_A = "00000000-0000-0000-0000-000000000101";
const ORG_B = "00000000-0000-0000-0000-000000000202";
const USER_A = "00000000-0000-0000-0000-000000000001";

function makeHeaders(orgId = ORG_A) {
  return {
    "x-user-id": USER_A,
    "x-organization-id": orgId,
  };
}

function makeAuthedPrisma() {
  const prisma = createMemoryPrisma({
    users: [{ id: USER_A, email: "owner@acme.test" }],
    memberships: [{ id: "m1", organizationId: ORG_A, userId: USER_A, role: "owner", status: "active" }],
  });
  return prisma;
}

describe("Critical flows (API + minimal UI rendering)", () => {
  it("1) Create chicken -> list -> search -> edit -> status change", async () => {
    const prisma = makeAuthedPrisma();
    const app = createApp(prisma as any);

    const createRes = await app.request("http://test/chickens", {
      method: "POST",
      headers: { ...makeHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        visual_id_type: "leg_band",
        visual_id_color: "red",
        visual_id_number: "0142",
        breed_primary: "Plymouth Rock",
        sex: "hen",
        status: "alive",
        coop_location_name: "Breeder Pen 1",
      }),
    });
    expect(createRes.status).toBe(201);
    const createdId = (await createRes.json()).id as string;
    const created = prisma.__state.chickens.find((c) => c.id === createdId)!;
    expect(created.uniqueCode).toBeTruthy();

    const listRes = await app.request("http://test/chickens?page_size=50", { headers: makeHeaders() });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.total).toBe(1);

    const searchRes = await app.request(`http://test/chickens?search=${encodeURIComponent(created.uniqueCode)}`, {
      headers: makeHeaders(),
    });
    const searchBody = await searchRes.json();
    expect(searchBody.total).toBe(1);

    const editRes = await app.request(`http://test/chickens/${createdId}`, {
      method: "PATCH",
      headers: { ...makeHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ coop_location_name: "Layer Coop A" }),
    });
    expect(editRes.status).toBe(200);

    const statusRes = await app.request(`http://test/chickens/${createdId}`, {
      method: "PATCH",
      headers: { ...makeHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ status: "sold" }),
    });
    expect(statusRes.status).toBe(200);
    const updated = prisma.__state.chickens.find((c) => c.id === createdId)!;
    expect(updated.status).toBe("sold");
    expect(updated.statusDate).toBeInstanceOf(Date);
  });

  it("2) Create breeding event -> inbreeding warnings -> save", async () => {
    const prisma = makeAuthedPrisma();
    const app = createApp(prisma as any);

    const sire = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "leg_band",
        visualIdColor: "red",
        visualIdNumber: "S1",
        breedPrimary: "Rhode Island Red",
        breedSecondary: null,
        sex: "rooster",
        status: "alive",
      },
    });
    const dam = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "zip_tie",
        visualIdColor: "blue",
        visualIdNumber: "D1",
        breedPrimary: "Rhode Island Red",
        breedSecondary: null,
        sex: "hen",
        status: "alive",
      },
    });

    const riskRes = await app.request(
      `http://test/breeding-events/pair-risk?sire_id=${encodeURIComponent((sire as any).id)}&dam_id=${encodeURIComponent(
        (dam as any).id,
      )}`,
      { headers: makeHeaders() },
    );
    expect(riskRes.status).toBe(200);
    const riskBody = await riskRes.json();
    expect(Array.isArray(riskBody.warnings)).toBe(true);

    const createRes = await app.request("http://test/breeding-events", {
      method: "POST",
      headers: { ...makeHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        sire_id: (sire as any).id,
        dam_id: (dam as any).id,
        start_date: "2025-01-10",
        end_date: "2025-01-18",
        notes: "test",
      }),
    });
    expect(createRes.status).toBe(201);
  });

  it("3) Add offspring (batch) -> parent links -> mixed breed defaults", async () => {
    const prisma = makeAuthedPrisma();
    const app = createApp(prisma as any);

    const sire = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "leg_band",
        visualIdColor: "red",
        visualIdNumber: "S2",
        breedPrimary: "BreedA",
        breedSecondary: null,
        sex: "rooster",
        status: "alive",
      },
    });
    const dam = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "zip_tie",
        visualIdColor: "green",
        visualIdNumber: "D2",
        breedPrimary: "BreedB",
        breedSecondary: null,
        sex: "hen",
        status: "alive",
      },
    });
    const be = await prisma.breedingEvent.create({
      data: {
        organizationId: ORG_A,
        sireId: (sire as any).id,
        damId: (dam as any).id,
        startDate: new Date("2025-01-10"),
        endDate: null,
        notes: null,
      },
    });

    const res = await app.request(`http://test/breeding-events/${(be as any).id}/offspring`, {
      method: "POST",
      headers: { ...makeHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ offspring: [{}, {}, {}] }),
    });
    expect(res.status).toBe(201);

    const kids = prisma.__state.chickens.filter((c) => c.sireId === (sire as any).id && c.damId === (dam as any).id);
    expect(kids.length).toBe(3);
    for (const k of kids) {
      expect(k.sex).toBe("unknown");
      expect(k.breedPrimary).toBe("BreedA");
      expect(k.breedSecondary).toBe("BreedB");
    }
  });

  it("4) Lineage tree renders correct parents/grandparents links", async () => {
    const prisma = makeAuthedPrisma();
    const app = createApp(prisma as any);

    const g1 = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "other",
        visualIdColor: "x",
        visualIdNumber: "G1",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "rooster",
        status: "alive",
      },
    });
    const g2 = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "other",
        visualIdColor: "x",
        visualIdNumber: "G2",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "hen",
        status: "alive",
      },
    });

    const sire = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "leg_band",
        visualIdColor: "red",
        visualIdNumber: "S3",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "rooster",
        status: "alive",
        sireId: (g1 as any).id,
        damId: (g2 as any).id,
      },
    });

    const dam = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "zip_tie",
        visualIdColor: "blue",
        visualIdNumber: "D3",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "hen",
        status: "alive",
      },
    });

    const child = await prisma.chicken.create({
      data: {
        organizationId: ORG_A,
        visualIdType: "zip_tie",
        visualIdColor: "green",
        visualIdNumber: "C1",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "unknown",
        status: "alive",
        sireId: (sire as any).id,
        damId: (dam as any).id,
      },
    });

    const apiRes = await app.request(`http://test/chickens/${(child as any).id}`, { headers: makeHeaders() });
    expect(apiRes.status).toBe(200);
    const payload = await apiRes.json();
    expect(payload.sire?.id).toBe((sire as any).id);
    expect(payload.sire?.sire?.id).toBe((g1 as any).id);

    const html = renderToStaticMarkup(React.createElement(LineageTree as any, { chicken: payload as any }));
    expect(html).toContain(`/chickens/${(sire as any).id}`);
    expect(html).toContain(`/chickens/${(g1 as any).id}`);
  });

  it("5) Org scoping prevents cross-tenant access (404)", async () => {
    const prisma = createMemoryPrisma({
      users: [{ id: USER_A, email: "owner@acme.test" }],
      memberships: [
        { id: "m1", organizationId: ORG_A, userId: USER_A, role: "owner", status: "active" },
        { id: "m2", organizationId: ORG_B, userId: USER_A, role: "owner", status: "active" },
      ],
    });
    const app = createApp(prisma as any);

    const other = await prisma.chicken.create({
      data: {
        organizationId: ORG_B,
        visualIdType: "leg_band",
        visualIdColor: "black",
        visualIdNumber: "X",
        breedPrimary: "X",
        breedSecondary: null,
        sex: "hen",
        status: "alive",
      },
    });

    const res = await app.request(`http://test/chickens/${(other as any).id}`, { headers: makeHeaders(ORG_A) });
    expect(res.status).toBe(404);
  });

  it("6) Import CSV -> verify counts -> verify parent linking by unique_code", async () => {
    const prisma = makeAuthedPrisma();
    const app = createApp(prisma as any);

    const csv = [
      "unique_code,visual_id_type,visual_id_color,visual_id_number,breed_primary,sex,sire_unique_code,dam_unique_code",
      'SIRE1,leg_band,red,SIRE-V,BreedA,rooster,,',
      'DAM1,zip_tie,blue,DAM-V,BreedB,hen,,',
      'CHILD1,zip_tie,green,CHILD-V,Mixed,unknown,SIRE1,DAM1',
      "",
    ].join("\n");

    const form = new FormData();
    form.set(
      "file",
      new File([csv], "import.csv", {
        type: "text/csv",
      }),
    );
    form.set(
      "mapping",
      JSON.stringify({
        unique_code: "unique_code",
        visual_id_type: "visual_id_type",
        visual_id_color: "visual_id_color",
        visual_id_number: "visual_id_number",
        breed_primary: "breed_primary",
        sex: "sex",
        sire_unique_code: "sire_unique_code",
        dam_unique_code: "dam_unique_code",
      }),
    );

    const res = await app.request("http://test/import/chickens", { method: "POST", headers: makeHeaders(), body: form as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows_total).toBe(3);
    expect(body.rows_created).toBe(3);
    expect(body.rows_failed).toBe(0);

    const child = prisma.__state.chickens.find((c) => c.uniqueCode === "CHILD1")!;
    const sire = prisma.__state.chickens.find((c) => c.uniqueCode === "SIRE1")!;
    const dam = prisma.__state.chickens.find((c) => c.uniqueCode === "DAM1")!;
    expect(child.sireId).toBe(sire.id);
    expect(child.damId).toBe(dam.id);
  });
});


