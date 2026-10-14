import { useQuery } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { ApiContext } from "@/lib/api-client-context";
import { RateSheet } from "./rate-sheet";
import {
  ratePromptHint,
  ratePromptTitle,
  type MarketplaceRatingPrompt,
} from "./rate";
import styles from "./home.module.scss";

export function RateLastClass({
  enabled,
}: {
  enabled: boolean;
}) {
  const api = useContext(ApiContext);
  const [open, setOpen] = useState<MarketplaceRatingPrompt | null>(null);
  const pending = useQuery({
    queryKey: ["marketplace-ratings-pending"],
    queryFn: () =>
      api!.get<MarketplaceRatingPrompt[]>("/discover/ratings/pending"),
    enabled: enabled && Boolean(api),
    staleTime: 30_000,
  });
  const prompt = pending.data?.[0] ?? null;
  if (!prompt) return null;

  return (
    <>
      <button
        type="button"
        className={styles.ratePrompt}
        data-testid="marketplace-rate-prompt"
        onClick={() => setOpen(prompt)}
      >
        <span className={styles.rateKicker}>Rate last class</span>
        <strong>{ratePromptTitle(prompt)}</strong>
        <span>{ratePromptHint(prompt)}</span>
      </button>
      <RateSheet
        open={Boolean(open)}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
        }}
        prompt={open}
      />
    </>
  );
}
