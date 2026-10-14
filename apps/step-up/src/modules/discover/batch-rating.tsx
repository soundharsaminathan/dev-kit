import { Icon } from "@dev-ui/icons";
import { useEffect, useState } from "react";
import styles from "./batch-rating.module.scss";

type BatchRatingInputProps = {
  value: number | null;
  onChange: (rating: number) => void;
  isPending?: boolean;
  isError?: boolean;
};

export function BatchRatingInput({
  value,
  onChange,
  isPending = false,
  isError = false,
}: BatchRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState<number | null>(null);

  useEffect(() => {
    setOptimistic(null);
  }, [value]);

  useEffect(() => {
    if (isError) {
      setOptimistic(null);
    }
  }, [isError]);

  const committed = optimistic ?? value ?? 0;
  const activeValue = hovered ?? committed;

  return (
    <fieldset className={styles.root} onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= activeValue;

        return (
          <button
            key={starValue}
            type="button"
            aria-pressed={committed === starValue}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            className={styles.star}
            data-filled={filled || undefined}
            disabled={isPending}
            onMouseEnter={() => setHovered(starValue)}
            onFocus={() => setHovered(starValue)}
            onBlur={() => setHovered(null)}
            onClick={() => {
              setOptimistic(starValue);
              setHovered(null);
              onChange(starValue);
            }}
          >
            <Icon name="star" />
          </button>
        );
      })}
    </fieldset>
  );
}
