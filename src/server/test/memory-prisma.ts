import { randomUUID } from "node:crypto";

export interface MemoryOrgMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "member" | "viewer";
  status: "active" | "invited";
}

export interface MemoryUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface MemoryChicken {
  id: string;
  organizationId: string;
  uniqueCode: string;
  visualIdType: string;
  visualIdColor: string;
  visualIdNumber: string;
  breedPrimary: string;
  breedSecondary: string | null;
  sex: string;
  hatchDate: Date | null;
  sireId: string | null;
  damId: string | null;
  colorTraits: any;
  status: string;
  statusDate: Date | null;
  coopLocationName: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryBreedingEvent {
  id: string;
  organizationId: string;
  sireId: string;
  damId: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryState {
  users: MemoryUser[];
  memberships: MemoryOrgMembership[];
  chickens: MemoryChicken[];
  breedingEvents: MemoryBreedingEvent[];
}

function now(): Date {
  return new Date();
}

function genCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

function asDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object";
}

function matchesWhere(row: Record<string, any>, where: any): boolean {
  if (!where) return true;

  if (where.AND && Array.isArray(where.AND)) return where.AND.every((w: any) => matchesWhere(row, w));
  if (where.OR && Array.isArray(where.OR)) return where.OR.some((w: any) => matchesWhere(row, w));
  if (where.NOT) return !matchesWhere(row, where.NOT);

  for (const [key, condition] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") continue;

    const value = (row as any)[key];

    if (isObject(condition) && "in" in condition && Array.isArray((condition as any).in)) {
      if (!(condition as any).in.includes(value)) return false;
      continue;
    }

    if (isObject(condition) && "contains" in condition) {
      const needle = String((condition as any).contains ?? "");
      const hay = String(value ?? "");
      const mode = (condition as any).mode;
      if (mode === "insensitive") {
        if (!hay.toLowerCase().includes(needle.toLowerCase())) return false;
      } else {
        if (!hay.includes(needle)) return false;
      }
      continue;
    }

    if (isObject(condition) && ("lte" in condition || "gte" in condition)) {
      const d = asDate(value);
      if (!d) return false;
      if ("lte" in condition) {
        const max = asDate((condition as any).lte);
        if (max && d > max) return false;
      }
      if ("gte" in condition) {
        const min = asDate((condition as any).gte);
        if (min && d < min) return false;
      }
      continue;
    }

    // scalar equality (including null)
    if (value !== condition) return false;
  }

  return true;
}

function orderRows(rows: any[], orderBy: any): any[] {
  if (!orderBy) return rows;
  const [[key, dir]] = Object.entries(orderBy);
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return av > bv ? sign : -sign;
  });
}

export function createMemoryPrisma(seed?: Partial<MemoryState>) {
  const state: MemoryState = {
    users: seed?.users ?? [],
    memberships: seed?.memberships ?? [],
    chickens: seed?.chickens ?? [],
    breedingEvents: seed?.breedingEvents ?? [],
  };

  return {
    __state: state,

    user: {
      async findUnique(args: any) {
        const where = args?.where ?? {};
        if (where.id) return state.users.find((u) => u.id === where.id) ?? null;
        if (where.email) return state.users.find((u) => u.email === where.email) ?? null;
        return null;
      },
      async create(args: any) {
        const id = args?.data?.id ?? randomUUID();
        const user: MemoryUser = { id, email: String(args?.data?.email), name: args?.data?.name ?? null };
        state.users.push(user);
        return user as any;
      },
    },

    organizationMembership: {
      async findMany(args: any) {
        const where = args?.where ?? {};
        return state.memberships.filter((m) => matchesWhere(m as any, where)) as any;
      },
      async findFirst(args: any) {
        const where = args?.where ?? {};
        return (state.memberships.find((m) => matchesWhere(m as any, where)) ?? null) as any;
      },
      async create(args: any) {
        const id = args?.data?.id ?? randomUUID();
        const m: MemoryOrgMembership = {
          id,
          organizationId: String(args?.data?.organizationId),
          userId: String(args?.data?.userId),
          role: (args?.data?.role ?? "member") as any,
          status: (args?.data?.status ?? "active") as any,
        };
        state.memberships.push(m);
        return m as any;
      },
      async update(args: any) {
        const where = args?.where ?? {};
        const key = where?.organizationId_userId;
        const orgId = key?.organizationId;
        const userId = key?.userId;
        const found = state.memberships.find((m) => m.organizationId === orgId && m.userId === userId);
        if (!found) throw new Error("not found");
        Object.assign(found, args?.data ?? {});
        return found as any;
      },
      async delete(args: any) {
        const where = args?.where ?? {};
        const key = where?.organizationId_userId;
        const orgId = key?.organizationId;
        const userId = key?.userId;
        const idx = state.memberships.findIndex((m) => m.organizationId === orgId && m.userId === userId);
        if (idx < 0) throw new Error("not found");
        const [deleted] = state.memberships.splice(idx, 1);
        return deleted as any;
      },
    },

    chicken: {
      async findFirst(args: any) {
        const where = args?.where ?? {};
        const include = args?.include ?? null;
        const row = state.chickens.find((c) => matchesWhere(c as any, where)) ?? null;
        if (!row) return null;
        return include ? (includeChicken(row, include) as any) : (row as any);
      },
      async findMany(args: any) {
        const where = args?.where ?? {};
        const include = args?.include ?? null;
        const orderBy = args?.orderBy ?? null;
        const skip = Number(args?.skip ?? 0);
        const take = args?.take === undefined ? undefined : Number(args.take);

        let rows = state.chickens.filter((c) => matchesWhere(c as any, where));
        rows = orderRows(rows, orderBy) as any;
        if (skip) rows = rows.slice(skip);
        if (take !== undefined) rows = rows.slice(0, take);

        return include ? rows.map((r) => includeChicken(r, include) as any) : (rows as any);
      },
      async count(args: any) {
        const where = args?.where ?? {};
        return state.chickens.filter((c) => matchesWhere(c as any, where)).length;
      },
      async create(args: any) {
        const data = args?.data ?? {};
        const createdAt = now();
        const id = data.id ?? randomUUID();
        const chicken: MemoryChicken = {
          id,
          organizationId: String(data.organizationId),
          uniqueCode: String(data.uniqueCode ?? genCode()),
          visualIdType: String(data.visualIdType),
          visualIdColor: String(data.visualIdColor),
          visualIdNumber: String(data.visualIdNumber),
          breedPrimary: String(data.breedPrimary),
          breedSecondary: data.breedSecondary ?? null,
          sex: String(data.sex),
          hatchDate: asDate(data.hatchDate),
          sireId: data.sireId ?? null,
          damId: data.damId ?? null,
          colorTraits: data.colorTraits ?? null,
          status: String(data.status),
          statusDate: asDate(data.statusDate),
          coopLocationName: data.coopLocationName ?? null,
          notes: data.notes ?? null,
          deletedAt: data.deletedAt ?? null,
          createdAt,
          updatedAt: createdAt,
        };
        state.chickens.push(chicken);
        return chicken as any;
      },
      async update(args: any) {
        const id = args?.where?.id;
        const found = state.chickens.find((c) => c.id === id);
        if (!found) throw new Error("not found");
        const data = args?.data ?? {};
        Object.assign(found, data);
        found.updatedAt = now();
        return found as any;
      },
    },

    breedingEvent: {
      async findFirst(args: any) {
        const where = args?.where ?? {};
        const include = args?.include ?? null;
        const ev = state.breedingEvents.find((e) => matchesWhere(e as any, where)) ?? null;
        if (!ev) return null;
        return include ? (includeBreedingEvent(ev, include) as any) : (ev as any);
      },
      async findMany(args: any) {
        const where = args?.where ?? {};
        const include = args?.include ?? null;
        const orderBy = args?.orderBy ?? null;
        let rows = state.breedingEvents.filter((e) => matchesWhere(e as any, where));
        rows = orderRows(rows, orderBy) as any;
        const skip = Number(args?.skip ?? 0);
        const take = args?.take === undefined ? undefined : Number(args.take);
        if (skip) rows = rows.slice(skip);
        if (take !== undefined) rows = rows.slice(0, take);
        return include ? rows.map((e) => includeBreedingEvent(e, include) as any) : (rows as any);
      },
      async create(args: any) {
        const data = args?.data ?? {};
        const createdAt = now();
        const ev: MemoryBreedingEvent = {
          id: data.id ?? randomUUID(),
          organizationId: String(data.organizationId),
          sireId: String(data.sireId),
          damId: String(data.damId),
          startDate: asDate(data.startDate) ?? now(),
          endDate: asDate(data.endDate),
          notes: data.notes ?? null,
          createdAt,
          updatedAt: createdAt,
        };
        state.breedingEvents.push(ev);
        return ev as any;
      },
      async update(args: any) {
        const id = args?.where?.id;
        const found = state.breedingEvents.find((e) => e.id === id);
        if (!found) throw new Error("not found");
        Object.assign(found, args?.data ?? {});
        found.updatedAt = now();
        return found as any;
      },
    },
  };

  function includeChicken(row: MemoryChicken, include: any): any {
    const out: any = { ...row };
    if (include.sire) {
      const sire = row.sireId
        ? state.chickens.find((c) => c.id === row.sireId && c.organizationId === row.organizationId) ?? null
        : null;
      out.sire = sire ? includeChicken(sire, include.sire.include ?? {}) : null;
    }
    if (include.dam) {
      const dam = row.damId
        ? state.chickens.find((c) => c.id === row.damId && c.organizationId === row.organizationId) ?? null
        : null;
      out.dam = dam ? includeChicken(dam, include.dam.include ?? {}) : null;
    }
    return out;
  }

  function includeBreedingEvent(ev: MemoryBreedingEvent, include: any): any {
    const out: any = { ...ev };
    if (include.sire) {
      const sire = state.chickens.find((c) => c.id === ev.sireId && c.organizationId === ev.organizationId) ?? null;
      out.sire = sire ? pickSelected(sire, include.sire.select) : null;
    }
    if (include.dam) {
      const dam = state.chickens.find((c) => c.id === ev.damId && c.organizationId === ev.organizationId) ?? null;
      out.dam = dam ? pickSelected(dam, include.dam.select) : null;
    }
    return out;
  }

  function pickSelected(row: any, select: any) {
    if (!select) return row;
    const out: any = {};
    for (const [k, v] of Object.entries(select)) if (v) out[k] = row[k];
    return out;
  }
}


