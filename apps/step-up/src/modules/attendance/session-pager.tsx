import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import styles from "./session-pager.module.scss";

type SessionPagerProps = {
  previousId: string | null;
  nextId: string | null;
};

export function SessionPager({ previousId, nextId }: SessionPagerProps) {
  const navigate = useNavigate();

  function goTo(sessionId: string) {
    void navigate({
      to: "/app/sessions/$id/attendance",
      params: { id: sessionId },
    });
  }

  return (
    <div className={styles.root}>
      <Button
        variant="quiet"
        size="md"
        isIconOnly
        className={styles.button}
        aria-label="Previous session"
        data-testid="prev-session"
        isDisabled={!previousId}
        onClick={() => {
          if (previousId) goTo(previousId);
        }}
      >
        <Icon name="chevron-left" />
      </Button>
      <Button
        variant="quiet"
        size="md"
        isIconOnly
        className={styles.button}
        aria-label="Next session"
        data-testid="next-session"
        isDisabled={!nextId}
        onClick={() => {
          if (nextId) goTo(nextId);
        }}
      >
        <Icon name="chevron-right" />
      </Button>
    </div>
  );
}
