import { cookies } from "next/headers";

export interface DevSession {
  userId: string;
  organizationId: string;
}

export async function getDevSession(): Promise<DevSession> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("dev_user_id")?.value ?? "00000000-0000-0000-0000-000000000001";
  const organizationId = cookieStore.get("dev_organization_id")?.value ?? "00000000-0000-0000-0000-000000000101";
  return { userId, organizationId };
}


