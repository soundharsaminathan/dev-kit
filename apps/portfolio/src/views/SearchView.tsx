import { allFileIds, files } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

export function SearchView() {
  const { searchQuery, setSearchQuery, openFile } = useIde();
  const q = searchQuery.trim().toLowerCase();
  const hits = q
    ? allFileIds
        .map((id) => files[id])
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .filter(
          (f) =>
            f.path.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            f.body.toLowerCase().includes(q),
        )
    : [];

  return (
    <div>
      <div className={styles.searchBox}>
        <input
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files in workspace"
          aria-label="Search workspace"
        />
      </div>
      {!q ? (
        <div
          style={{
            padding: "8px 14px",
            color: "var(--ide-fg-muted)",
            fontSize: 12,
          }}
        >
          Search About, skills, experience, projects…
        </div>
      ) : hits.length === 0 ? (
        <div
          style={{
            padding: "8px 14px",
            color: "var(--ide-fg-muted)",
            fontSize: 12,
          }}
        >
          No results
        </div>
      ) : (
        hits.map((f) => (
          <button
            key={f.id}
            type="button"
            className={styles.searchHit}
            onClick={() => openFile(f.id)}
          >
            <div>{f.title}</div>
            <div className={styles.searchPath}>{f.path}</div>
          </button>
        ))
      )}
    </div>
  );
}
