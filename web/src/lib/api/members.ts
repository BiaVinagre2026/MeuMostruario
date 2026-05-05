import { apiClient } from "./client";

export interface AdminMember {
  id: number;
  cpf: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  plan_category: string | null;
  plan_status: string;
  status: string;
  tags: string[] | null;
  created_at: string;
}

interface MembersResponse {
  members: AdminMember[];
  meta: { total_count: number; total_pages: number; current_page: number };
}

export async function getMembers(params: {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
}): Promise<MembersResponse> {
  const qs = new URLSearchParams();
  if (params.page)     qs.set("page",     String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.q)        qs.set("q",        params.q);
  if (params.status)   qs.set("status",   params.status);
  return apiClient.get<MembersResponse>(`/api/v1/admin/members?${qs}`);
}

export async function updateMemberStatus(id: number, status: string): Promise<void> {
  await apiClient.patch(`/api/v1/admin/members/${id}`, { member: { status } });
}
