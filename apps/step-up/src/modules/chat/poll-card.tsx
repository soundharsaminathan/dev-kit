import { useRef, useState } from "react";
import styles from "./cards.module.scss";
import type { ChatPoll } from "./types";

type PollCardProps = {
  poll: ChatPoll;
  currentUserId: string;
  onVote: (optionIds: string[]) => void;
  votePending?: boolean | undefined;
};

function voterIdsFor(poll: ChatPoll, currentUserId: string) {
  return poll.options
    .filter((option) => option.voterIds.includes(currentUserId))
    .map((option) => option.id);
}

function voteCount(poll: ChatPoll) {
  if (poll.totalVotes > 0) {
    return poll.totalVotes;
  }
  const fromCounts = poll.options.reduce(
    (sum, option) => sum + option.count,
    0,
  );
  if (fromCounts > 0) {
    return fromCounts;
  }
  return new Set(poll.options.flatMap((option) => option.voterIds)).size;
}

export function PollCard({
  poll,
  currentUserId,
  onVote,
  votePending,
}: PollCardProps) {
  const myVotes = voterIdsFor(poll, currentUserId);
  const myVotesKey = myVotes.slice().sort().join("\0");
  const selectedForVotesKey = useRef(myVotesKey);
  const [selected, setSelected] = useState<string[]>(() =>
    voterIdsFor(poll, currentUserId),
  );

  if (selectedForVotesKey.current !== myVotesKey) {
    selectedForVotesKey.current = myVotesKey;
    setSelected(myVotes);
  }
  const closed = Boolean(poll.closesAt && new Date(poll.closesAt) < new Date());
  const dirty =
    selected.length !== myVotes.length ||
    selected.some((id) => !myVotes.includes(id));
  const showResults = myVotes.length > 0 || closed;
  const totalVotes = voteCount(poll);
  const ballotTotal = poll.options.reduce(
    (sum, option) => sum + option.count,
    0,
  );
  const percentBase = ballotTotal > 0 ? ballotTotal : totalVotes;

  function toggle(optionId: string) {
    if (closed) {
      return;
    }
    if (poll.multiSelect) {
      setSelected((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      );
    } else {
      setSelected([optionId]);
    }
  }

  return (
    <div className={styles.poll}>
      <span className={styles.pollEyebrow}>
        Poll{poll.multiSelect ? " · multi" : ""}
      </span>
      <p className={styles.pollQuestion}>{poll.question}</p>

      <div className={styles.pollOptions}>
        {poll.options.map((option) => {
          const percent =
            percentBase > 0
              ? Math.round((option.count / percentBase) * 100)
              : 0;
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={styles.pollOption}
              data-selected={isSelected || undefined}
              disabled={closed}
              onClick={() => toggle(option.id)}
            >
              <span className={styles.pollOptionMain}>
                <span className={styles.pollRadio} aria-hidden />
                <span className={styles.pollOptionLabel}>{option.label}</span>
              </span>
              {showResults ? (
                <span className={styles.pollPercent}>{percent}%</span>
              ) : null}
              {showResults ? (
                <span className={styles.pollTrack}>
                  <span
                    className={styles.pollFill}
                    style={{ width: `${percent}%` }}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={styles.pollFooter}>
        <span>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
          {closed ? " · Closed" : ""}
        </span>
        {!closed && dirty && selected.length > 0 ? (
          <button
            type="button"
            className={styles.pollVote}
            disabled={votePending}
            onClick={() => onVote(selected)}
          >
            {votePending ? "Voting…" : "Vote"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
