import { useAuth } from "@/lib/auth";

/** Active company id for staff API calls (null for system admin). */
export function useCompanyId() {
  const { user } = useAuth();
  return user?.companyId ?? null;
}
