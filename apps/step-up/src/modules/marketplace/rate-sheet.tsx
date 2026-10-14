import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { SuccessState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  marketplaceRatingStars,
  ratePromptHint,
  ratePromptTitle,
  type MarketplaceRatingPrompt,
} from "./rate";
import styles from "./rate-sheet.module.scss";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function RateSheet({
  open,
  onOpenChange,
  prompt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: MarketplaceRatingPrompt | null;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [openKey, setOpenKey] = useState("");
  const nextKey = open
    ? `${prompt?.studentId ?? ""}:${prompt?.target ?? ""}:${prompt?.category ?? ""}:${prompt?.studioId ?? ""}:${prompt?.trainerId ?? ""}`
    : "";

  if (nextKey !== openKey) {
    setOpenKey(nextKey);
    setStars(0);
    setError(null);
    setDone(false);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!prompt) throw new Error("Nothing to rate");
      const rating = marketplaceRatingStars(stars);
      if (rating == null) throw new Error("Pick 1 to 5 stars");
      return api.post("/discover/ratings", {
        studentId: prompt.studentId,
        target: prompt.target,
        studioId: prompt.studioId ?? undefined,
        trainerId: prompt.trainerId ?? undefined,
        category: prompt.category,
        rating,
      });
    },
    onSuccess: async () => {
      setDone(true);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["marketplace-ratings-pending"] });
    },
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this rating",
      );
    },
  });

  return (
    <AppSheet
      isOpen={open}
      onOpenChange={onOpenChange}
      title={done ? "Thanks" : prompt ? ratePromptTitle(prompt) : "Rate"}
    >
      <div className={styles.body} data-testid="marketplace-rate-sheet">
        {done ? (
          <SuccessState
            title="Stars saved"
            description="This stays in the visit category you attended."
          />
        ) : prompt ? (
          <>
            <p className={styles.hint}>{ratePromptHint(prompt)}</p>
            <p className={styles.who}>For {prompt.studentName}</p>
            <div className={styles.stars} role="radiogroup" aria-label="Stars">
              {STAR_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.star}
                  data-active={stars >= value || undefined}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setStars(value)}
                >
                  ★
                </button>
              ))}
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Submit rating
            </TouchButton>
          </>
        ) : null}
      </div>
    </AppSheet>
  );
}
