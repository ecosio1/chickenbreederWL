export interface RequestContext {
  userId: string;
  currentOrganizationId: string;
}

export interface PrismaLike {
  user: {
    findUnique(args: { where: { id?: string; email?: string } }): Promise<{ id: string } | null>;
    create?(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  organizationMembership: {
    findFirst(args: {
      where: { organizationId: string; userId: string; status?: "active" | "invited" };
    }): Promise<{ id: string; role?: "owner" | "member" | "viewer" } | null>;
    findMany(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<
      Array<{
        id: string;
        organizationId: string;
        role?: "owner" | "member" | "viewer";
        status?: "active" | "invited";
      }>
    >;
    create?(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    update?(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    delete?(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  chicken: {
    findFirst(args: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    }): Promise<Record<string, unknown> | null>;
    findMany(args: {
      where: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: Record<string, "asc" | "desc">;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  breedingEvent: {
    findFirst(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      include?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<Array<Record<string, unknown>>>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}


