export type AdjacentSession = {
  id: string;
  startsAt: string;
};

export function adjacentSessions(
  sessions: AdjacentSession[],
  currentId: string,
): { previousId: string | null; nextId: string | null } {
  const sorted = [...sessions].sort((a, b) => {
    const byTime =
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  const index = sorted.findIndex((session) => session.id === currentId);
  if (index < 0) {
    return { previousId: null, nextId: null };
  }
  return {
    previousId: sorted[index - 1]?.id ?? null,
    nextId: sorted[index + 1]?.id ?? null,
  };
}
