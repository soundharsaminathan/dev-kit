import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import type {
  Contest,
  ContestEntry,
  ContestScore,
} from "@/modules/contests/types";
import { ApiState } from "@/modules/ui/api-state";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";

export const Route = createFileRoute("/app/contests/$id")({
  component: ContestDetailPage,
});

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | undefined
> = {
  OPEN: "success",
  DRAFT: "warning",
  CLOSED: "info",
  COMPLETED: "info",
  CANCELLED: "danger",
  CONFIRMED: "success",
  PENDING: "warning",
  WITHDRAWN: "danger",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function entryLabel(entry: ContestEntry) {
  return (
    entry.teamName ||
    entry.members.map((member) => member.name).join(", ") ||
    "Entry"
  );
}

function averageScore(scores: ContestScore[]) {
  if (scores.length === 0) {
    return null;
  }
  const total = scores.reduce((sum, item) => sum + item.score, 0);
  return Math.round((total / scores.length) * 10) / 10;
}

function ContestDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ContestDetailPage");
  const [placementDrafts, setPlacementDrafts] = useState<
    Record<string, string>
  >({});
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { score: string; notes: string }>
  >({});

  const isManager = user?.role === "OWNER" || user?.role === "STAFF";

  const contestQuery = useQuery({
    queryKey: ["contests", id],
    queryFn: () => api.get<Contest>(`/contests/${id}`),
  });

  const entriesQuery = useQuery({
    queryKey: ["contests", id, "entries"],
    queryFn: () => api.get<ContestEntry[]>(`/contests/${id}/entries`),
  });

  const scoresQuery = useQuery({
    queryKey: ["contests", id, "scores"],
    queryFn: () => api.get<ContestScore[]>(`/contests/${id}/scores`),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/contests/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contests", id] });
      void queryClient.invalidateQueries({ queryKey: ["contests"] });
      toast({
        title: "Status updated",
        description: "Contest status was saved.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t update status",
        description:
          error instanceof Error ? error.message : "Could not update status.",
        variant: "error",
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: ({
      entryId,
      placement,
    }: {
      entryId: string;
      placement: number | null;
    }) => api.patch(`/contests/entries/${entryId}`, { placement }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contests", id, "entries"],
      });
      toast({
        title: "Placement saved",
        description: "Entry placement was updated.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t save placement",
        description:
          error instanceof Error ? error.message : "Could not save placement.",
        variant: "error",
      });
    },
  });

  const upsertScore = useMutation({
    mutationFn: ({
      entryId,
      score,
      notes,
    }: {
      entryId: string;
      score: number;
      notes: string | null;
    }) => api.put(`/contests/entries/${entryId}/score`, { score, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contests", id, "scores"],
      });
      toast({
        title: "Score saved",
        description: "The judge score was recorded.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t save score",
        description:
          error instanceof Error ? error.message : "Could not save score.",
        variant: "error",
      });
    },
  });

  const issueCertificate = useMutation({
    mutationFn: (entryId: string) =>
      api.post(`/contests/entries/${entryId}/certificate`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contests", id, "entries"],
      });
      toast({
        title: "Certificate issued",
        description: "The certificate is now available for this entry.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t issue certificate",
        description:
          error instanceof Error
            ? error.message
            : "Could not issue certificate.",
        variant: "error",
      });
    },
  });

  const judgedCategoryIds = new Set(
    (contestQuery.data?.categories ?? [])
      .filter((category) =>
        category.judges.some((judge) => judge.id === user?.id),
      )
      .map((category) => category.id),
  );
  const canJudge = judgedCategoryIds.size > 0;
  const scoringOpen =
    contestQuery.data?.status === "OPEN" ||
    contestQuery.data?.status === "CLOSED";

  return (
    <section className="page stack">
      <ApiState
        isLoading={contestQuery.isLoading}
        isError={contestQuery.isError}
        error={contestQuery.error}
        data={contestQuery.data}
        emptyTitle="Contest not found"
        emptyDescription="This contest may have been removed."
      >
        {(contest) => (
          <>
            <PageHeader
              title={contest.title}
              description={
                contest.description ||
                `${formatDate(contest.startsAt)} – ${formatDate(contest.endsAt)}`
              }
              actions={
                <Button as={Link} to="/app/contests" variant="quiet">
                  Back
                </Button>
              }
            />

            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Status, schedule, and certificate defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="stack-sm">
                <Badge variant={STATUS_VARIANT[contest.status]}>
                  {contest.status}
                </Badge>
                <p>
                  {formatDate(contest.startsAt)} – {formatDate(contest.endsAt)}
                </p>
                {contest.branch ? <p>Branch: {contest.branch.name}</p> : null}
                <p>
                  Certificates:{" "}
                  {contest.certificationEnabled
                    ? (contest.certificateTemplate?.name ?? "Enabled")
                    : "Off"}
                </p>
                {isManager ? (
                  <Select
                    label="Update status"
                    selectedKey={contest.status}
                    onSelectionChange={(key) =>
                      updateStatus.mutate(String(key))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="DRAFT">Draft</SelectItem>
                      <SelectItem id="OPEN">Open</SelectItem>
                      <SelectItem id="CLOSED">Closed</SelectItem>
                      <SelectItem id="COMPLETED">Completed</SelectItem>
                      <SelectItem id="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories & judges</CardTitle>
                <CardDescription>
                  Each category has its own style, age band, and judges.
                </CardDescription>
              </CardHeader>
              <CardContent className="stack">
                {contest.categories.map((category) => (
                  <div key={category.id} className="stack-sm">
                    <strong>{category.name}</strong>
                    <span>
                      {category.danceStyle} · ages {category.ageMin}–
                      {category.ageMax} · {category.entryType}
                      {category._count
                        ? ` · ${category._count.entries} entries`
                        : ""}
                    </span>
                    <span>
                      Judges:{" "}
                      {category.judges.length
                        ? category.judges.map((judge) => judge.name).join(", ")
                        : "None assigned"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {canJudge ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your judging</CardTitle>
                  <CardDescription>
                    Score entries in categories you are assigned to judge
                    (0–100).
                    {!scoringOpen
                      ? " Scoring opens when the contest is Open or Closed."
                      : null}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApiState
                    isLoading={entriesQuery.isLoading || scoresQuery.isLoading}
                    isError={entriesQuery.isError || scoresQuery.isError}
                    error={entriesQuery.error ?? scoresQuery.error}
                    data={entriesQuery.data}
                    emptyTitle="No entries yet"
                    emptyDescription="Entries appear here once students register."
                  >
                    {(entries) => {
                      const myScores = new Map(
                        (scoresQuery.data ?? [])
                          .filter((score) => score.judgeId === user?.id)
                          .map((score) => [score.entryId, score]),
                      );
                      const judgeEntries = entries.filter(
                        (entry) =>
                          judgedCategoryIds.has(entry.categoryId) &&
                          entry.status !== "WITHDRAWN",
                      );

                      if (judgeEntries.length === 0) {
                        return (
                          <p>
                            No active entries in your assigned categories yet.
                          </p>
                        );
                      }

                      const byCategory = contest.categories
                        .filter((category) =>
                          judgedCategoryIds.has(category.id),
                        )
                        .map((category) => ({
                          category,
                          entries: judgeEntries.filter(
                            (entry) => entry.categoryId === category.id,
                          ),
                        }))
                        .filter((group) => group.entries.length > 0);

                      return (
                        <div className="stack">
                          {byCategory.map(({ category, entries: group }) => (
                            <div key={category.id} className="stack">
                              <strong>{category.name}</strong>
                              {group.map((entry) => {
                                const existing = myScores.get(entry.id);
                                const draft = scoreDrafts[entry.id];
                                const scoreValue =
                                  draft?.score ??
                                  (existing ? String(existing.score) : "");
                                const notesValue =
                                  draft?.notes ?? existing?.notes ?? "";
                                return (
                                  <div
                                    key={entry.id}
                                    className="stack-sm"
                                    style={{
                                      borderTop:
                                        "1px solid var(--border-muted, #ddd)",
                                      paddingTop: "0.75rem",
                                    }}
                                  >
                                    <div
                                      className="row"
                                      style={{ gap: "0.5rem" }}
                                    >
                                      <Badge
                                        variant={STATUS_VARIANT[entry.status]}
                                      >
                                        {entry.status}
                                      </Badge>
                                      <strong>{entryLabel(entry)}</strong>
                                      {existing ? (
                                        <Badge variant="success">Scored</Badge>
                                      ) : (
                                        <Badge variant="warning">
                                          Not scored
                                        </Badge>
                                      )}
                                    </div>
                                    {entry.teamName ? (
                                      <span>
                                        {entry.members
                                          .map((m) => m.name)
                                          .join(", ")}
                                      </span>
                                    ) : null}
                                    <div
                                      className="row"
                                      style={{
                                        gap: "0.75rem",
                                        flexWrap: "wrap",
                                        alignItems: "flex-end",
                                      }}
                                    >
                                      <FormInput
                                        label="Score (0–100)"
                                        type="number"
                                        value={scoreValue}
                                        onChange={(value) =>
                                          setScoreDrafts((current) => ({
                                            ...current,
                                            [entry.id]: {
                                              score: value,
                                              notes:
                                                current[entry.id]?.notes ??
                                                notesValue,
                                            },
                                          }))
                                        }
                                        placeholder="85"
                                        disabled={!scoringOpen}
                                      />
                                      <FormInput
                                        label="Notes (optional)"
                                        value={notesValue}
                                        onChange={(value) =>
                                          setScoreDrafts((current) => ({
                                            ...current,
                                            [entry.id]: {
                                              score:
                                                current[entry.id]?.score ??
                                                scoreValue,
                                              notes: value,
                                            },
                                          }))
                                        }
                                        placeholder="Strong musicality"
                                        disabled={!scoringOpen}
                                      />
                                      <Button
                                        variant="primary"
                                        isPending={
                                          upsertScore.isPending &&
                                          upsertScore.variables?.entryId ===
                                            entry.id
                                        }
                                        isDisabled={
                                          !scoringOpen ||
                                          scoreValue === "" ||
                                          Number.isNaN(Number(scoreValue))
                                        }
                                        onClick={() =>
                                          upsertScore.mutate({
                                            entryId: entry.id,
                                            score: Number(scoreValue),
                                            notes: notesValue.trim() || null,
                                          })
                                        }
                                      >
                                        {existing
                                          ? "Update score"
                                          : "Save score"}
                                      </Button>
                                    </div>
                                    {upsertScore.isError &&
                                    upsertScore.variables?.entryId ===
                                      entry.id ? (
                                      <p role="alert">
                                        {(upsertScore.error as Error).message}
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  </ApiState>
                </CardContent>
              </Card>
            ) : null}

            {isManager ? (
              <Card>
                <CardHeader>
                  <CardTitle>Entries</CardTitle>
                  <CardDescription>
                    Review judge averages, set placements, and issue
                    certificates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApiState
                    isLoading={entriesQuery.isLoading || scoresQuery.isLoading}
                    isError={entriesQuery.isError || scoresQuery.isError}
                    error={entriesQuery.error ?? scoresQuery.error}
                    data={entriesQuery.data}
                    emptyTitle="No entries yet"
                    emptyDescription="Students and parents can register from the member app."
                  >
                    {(entries) => {
                      const scoresByEntry = new Map<string, ContestScore[]>();
                      for (const score of scoresQuery.data ?? []) {
                        const list = scoresByEntry.get(score.entryId) ?? [];
                        list.push(score);
                        scoresByEntry.set(score.entryId, list);
                      }

                      return (
                        <div className="stack">
                          {entries.map((entry) => {
                            const category =
                              entry.category ??
                              contest.categories.find(
                                (item) => item.id === entry.categoryId,
                              );
                            const placementValue =
                              placementDrafts[entry.id] ??
                              (entry.placement != null
                                ? String(entry.placement)
                                : "");
                            const entryScores =
                              scoresByEntry.get(entry.id) ?? [];
                            const avg = averageScore(entryScores);
                            return (
                              <div
                                key={entry.id}
                                className="stack-sm"
                                style={{
                                  borderTop:
                                    "1px solid var(--border-muted, #ddd)",
                                  paddingTop: "0.75rem",
                                }}
                              >
                                <div className="row" style={{ gap: "0.5rem" }}>
                                  <Badge variant={STATUS_VARIANT[entry.status]}>
                                    {entry.status}
                                  </Badge>
                                  <strong>{entryLabel(entry)}</strong>
                                </div>
                                <span>
                                  {category?.name ?? "Category"}
                                  {entry.teamName
                                    ? ` · ${entry.members.map((m) => m.name).join(", ")}`
                                    : ""}
                                </span>
                                {avg != null ? (
                                  <span>
                                    Judge avg: {avg}
                                    {entryScores.length > 1
                                      ? ` (${entryScores.length} scores)`
                                      : " (1 score)"}
                                    {entryScores.some((s) => s.judge)
                                      ? ` — ${entryScores
                                          .map(
                                            (s) =>
                                              `${s.judge?.name ?? "Judge"}: ${s.score}`,
                                          )
                                          .join(", ")}`
                                      : null}
                                  </span>
                                ) : (
                                  <span>No judge scores yet</span>
                                )}
                                {entry.certificate ? (
                                  <Badge variant="success">
                                    Certificate{" "}
                                    {entry.certificate.certificateNumber
                                      ? entry.certificate.certificateNumber
                                      : "issued"}{" "}
                                    {new Date(
                                      entry.certificate.issuedAt,
                                    ).toLocaleDateString()}
                                  </Badge>
                                ) : null}
                                <div
                                  className="row"
                                  style={{ gap: "0.75rem", flexWrap: "wrap" }}
                                >
                                  <FormInput
                                    label="Placement"
                                    type="number"
                                    value={placementValue}
                                    onChange={(value) =>
                                      setPlacementDrafts((current) => ({
                                        ...current,
                                        [entry.id]: value,
                                      }))
                                    }
                                    placeholder="1"
                                  />
                                  <Button
                                    variant="quiet"
                                    isPending={updateEntry.isPending}
                                    onClick={() =>
                                      updateEntry.mutate({
                                        entryId: entry.id,
                                        placement: placementValue
                                          ? Number(placementValue)
                                          : null,
                                      })
                                    }
                                  >
                                    Save placement
                                  </Button>
                                  {contest.certificationEnabled &&
                                  !entry.certificate &&
                                  entry.status !== "WITHDRAWN" ? (
                                    <Button
                                      variant="primary"
                                      isPending={issueCertificate.isPending}
                                      onClick={() =>
                                        issueCertificate.mutate(entry.id)
                                      }
                                    >
                                      Issue certificate
                                    </Button>
                                  ) : null}
                                </div>
                                {issueCertificate.isError &&
                                issueCertificate.variables === entry.id ? (
                                  <p role="alert">
                                    {(issueCertificate.error as Error).message}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  </ApiState>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </ApiState>
    </section>
  );
}
