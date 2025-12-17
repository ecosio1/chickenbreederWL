import type { PrismaLike } from "./types";

export interface ScopedDb {
  chicken: {
    findById(id: string): Promise<{ id: string } | null>;
    list(): Promise<Array<{ id: string }>>;
    create(data: Record<string, unknown>): Promise<{ id: string }>;
    softDelete(id: string): Promise<{ id: string }>;
  };
  breedingEvent: {
    findById(id: string): Promise<{ id: string } | null>;
    list(): Promise<Array<{ id: string }>>;
    create(data: Record<string, unknown>): Promise<{ id: string }>;
  };
}

export function createScopedDb(prisma: PrismaLike, organizationId: string): ScopedDb {
  function withOrgWhere(where: Record<string, unknown>): Record<string, unknown> {
    return { ...where, organizationId, deletedAt: null };
  }

  function withOrgData(data: Record<string, unknown>): Record<string, unknown> {
    return { ...data, organizationId };
  }

  return {
    chicken: {
      async findById(id) {
        return prisma.chicken.findFirst({ where: withOrgWhere({ id }) }) as Promise<{ id: string } | null>;
      },
      async list() {
        return prisma.chicken.findMany({ where: withOrgWhere({}) }) as Promise<Array<{ id: string }>>;
      },
      async create(data) {
        return prisma.chicken.create({ data: withOrgData(data) }) as Promise<{ id: string }>;
      },
      async softDelete(id) {
        return prisma.chicken.update({
          where: { id },
          data: { deletedAt: new Date() },
        }) as Promise<{ id: string }>;
      },
    },
    breedingEvent: {
      async findById(id) {
        // breedingEvent has no deletedAt; enforce org scoping only
        return prisma.breedingEvent.findFirst({ where: { organizationId, id } }) as Promise<{ id: string } | null>;
      },
      async list() {
        return prisma.breedingEvent.findMany({ where: { organizationId } }) as Promise<Array<{ id: string }>>;
      },
      async create(data) {
        return prisma.breedingEvent.create({ data: withOrgData(data) }) as Promise<{ id: string }>;
      },
    },
  };
}


