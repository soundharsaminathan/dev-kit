import type { ReactNode } from "react";
import styles from "./views.module.scss";

export function JsonView({
  body,
  sample = false,
}: {
  body: string;
  sample?: boolean;
}) {
  return (
    <div>
      {sample ? (
        <div className={styles.view}>
          <div className={styles.badge}>Sample data · TODO: replace</div>
        </div>
      ) : null}
      <pre className={styles.json}>{highlightJson(body)}</pre>
    </div>
  );
}

function highlightJson(src: string): ReactNode[] {
  const tokenRe =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b\d+\b)|(\/\/.*)|([{\]},:])/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match = tokenRe.exec(src);
  while (match !== null) {
    if (match.index > last) {
      nodes.push(
        <span key={key++} className={styles.punct}>
          {src.slice(last, match.index)}
        </span>,
      );
    }
    if (match[1]) {
      nodes.push(
        <span key={key++} className={styles.key}>
          {match[1]}
        </span>,
      );
      nodes.push(
        <span key={key++} className={styles.punct}>
          :
        </span>,
      );
    } else if (match[2]) {
      nodes.push(
        <span key={key++} className={styles.string}>
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      nodes.push(
        <span key={key++} className={styles.number}>
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      nodes.push(
        <span key={key++} className={styles.comment}>
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      nodes.push(
        <span key={key++} className={styles.punct}>
          {match[5]}
        </span>,
      );
    }
    last = match.index + match[0].length;
    match = tokenRe.exec(src);
  }
  if (last < src.length) {
    nodes.push(
      <span key={key++} className={styles.punct}>
        {src.slice(last)}
      </span>,
    );
  }
  return nodes;
}
