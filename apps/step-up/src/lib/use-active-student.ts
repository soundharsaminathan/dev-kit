import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "./api-context";
import { useAuth } from "./auth";

type LinkedChild = {
  id: string;
  name: string;
};

type UserDetail = {
  id: string;
  parentLinks?: Array<{
    child: { id: string; name: string };
  }>;
};

type ActiveStudentResult = {
  loading: boolean;
  studentId: string;
  children: LinkedChild[];
  isParent: boolean;
  setActiveChild: (id: string) => void;
};

function storageKey(parentId: string) {
  return `step-up-active-child:${parentId}`;
}

function readStoredChild(parentId: string): string | null {
  try {
    return localStorage.getItem(storageKey(parentId));
  } catch {
    return null;
  }
}

function writeStoredChild(parentId: string, childId: string) {
  try {
    localStorage.setItem(storageKey(parentId), childId);
  } catch {
    // ignore
  }
}

export function useActiveStudent(): ActiveStudentResult {
  const { user } = useAuth();
  const api = useApi();

  const meQuery = useQuery({
    queryKey: ["users", user?.id, "me"],
    queryFn: () => api.get<UserDetail>(`/users/${user!.id}`),
    enabled: user?.role === "PARENT" && Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  });

  const children = useMemo<LinkedChild[]>(() => {
    if (!meQuery.data?.parentLinks) return [];
    return meQuery.data.parentLinks.map((link) => ({
      id: link.child.id,
      name: link.child.name,
    }));
  }, [meQuery.data]);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => {
    if (user?.role !== "PARENT") return null;
    return readStoredChild(user.id);
  });

  useEffect(() => {
    if (user?.role !== "PARENT" || children.length === 0) return;
    const valid = children.some((c) => c.id === selectedChildId);
    if (!valid && children[0]) {
      const first = children[0].id;
      setSelectedChildId(first);
      writeStoredChild(user.id, first);
    }
  }, [children, selectedChildId, user]);

  const setActiveChild = useCallback(
    (id: string) => {
      setSelectedChildId(id);
      if (user?.id) writeStoredChild(user.id, id);
    },
    [user?.id],
  );

  if (user?.role !== "PARENT") {
    return {
      loading: false,
      studentId: user?.id ?? "",
      children: [],
      isParent: false,
      setActiveChild,
    };
  }

  const studentId = selectedChildId ?? children[0]?.id ?? "";

  return {
    loading: meQuery.isLoading,
    studentId,
    children,
    isParent: true,
    setActiveChild,
  };
}
