import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "./api-context";
import { useAuth } from "./auth";

export type FamilyMemberKind = "KID" | "CO_STUDENT";

export type FamilyAccount = {
  id: string;
  name: string;
  kind?: FamilyMemberKind;
  photoUrl?: string | null;
  isSelf?: boolean;
};

type FamilyMemberDto = {
  id: string;
  name: string;
  kind: FamilyMemberKind;
  photoUrl: string | null;
  isDependent: boolean;
};

type ActiveStudentResult = {
  loading: boolean;
  studentId: string;
  accounts: FamilyAccount[];
  children: Array<{ id: string; name: string }>;
  familyMembers: FamilyMemberDto[];
  isParent: boolean;
  setActiveChild: (id: string) => void;
  setActiveAccount: (id: string) => void;
};

function storageKey(ownerId: string) {
  return `step-up-active-account:${ownerId}`;
}

function readStoredAccount(ownerId: string): string | null {
  try {
    return localStorage.getItem(storageKey(ownerId));
  } catch {
    return null;
  }
}

function writeStoredAccount(ownerId: string, accountId: string) {
  try {
    localStorage.setItem(storageKey(ownerId), accountId);
  } catch {
    // ignore
  }
}

export function useActiveStudent(): ActiveStudentResult {
  const { user } = useAuth();
  const api = useApi();
  const canManageFamily = user?.role === "STUDENT" || user?.role === "PARENT";

  const familyQuery = useQuery({
    queryKey: ["users", user?.id, "family-members"],
    queryFn: () => api.get<FamilyMemberDto[]>(`/users/me/family-members`),
    enabled: canManageFamily && Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  });

  const familyMembers = familyQuery.data ?? [];

  const accounts = useMemo<FamilyAccount[]>(() => {
    if (!user) return [];
    const me: FamilyAccount = {
      id: user.id,
      name: user.name ?? "Me",
      photoUrl: user.photoUrl ?? null,
      isSelf: true,
    };
    const linked = familyMembers.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      photoUrl: m.photoUrl,
      isSelf: false,
    }));
    return [me, ...linked];
  }, [familyMembers, user]);

  const children = useMemo(
    () =>
      familyMembers
        .filter((m) => m.kind === "KID")
        .map((m) => ({ id: m.id, name: m.name })),
    [familyMembers],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    () => {
      if (!user?.id || !canManageFamily) return null;
      return readStoredAccount(user.id);
    },
  );

  useEffect(() => {
    if (!user?.id || !canManageFamily || accounts.length === 0) return;
    const valid = accounts.some((a) => a.id === selectedAccountId);
    if (!valid) {
      const next = user.id;
      setSelectedAccountId(next);
      writeStoredAccount(user.id, next);
    }
  }, [accounts, canManageFamily, selectedAccountId, user]);

  const setActiveAccount = useCallback(
    (id: string) => {
      setSelectedAccountId(id);
      if (user?.id) writeStoredAccount(user.id, id);
    },
    [user?.id],
  );

  if (!canManageFamily || !user) {
    return {
      loading: false,
      studentId: user?.id ?? "",
      accounts: user
        ? [
            {
              id: user.id,
              name: user.name ?? "Me",
              photoUrl: user.photoUrl ?? null,
              isSelf: true,
            },
          ]
        : [],
      children: [],
      familyMembers: [],
      isParent: false,
      setActiveChild: setActiveAccount,
      setActiveAccount,
    };
  }

  const isParent = user.role === "PARENT";
  const studentId = isParent ? (selectedAccountId ?? user.id) : user.id;

  return {
    loading: familyQuery.isLoading,
    studentId,
    accounts,
    children,
    familyMembers,
    isParent,
    setActiveChild: setActiveAccount,
    setActiveAccount,
  };
}
