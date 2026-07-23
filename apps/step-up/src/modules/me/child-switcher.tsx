import styles from "./child-switcher.module.scss";
import { useActiveStudentContext } from "./use-active-student-context";

export function ChildSwitcher({
  tone = "default",
}: {
  tone?: "default" | "onMedia";
}) {
  const { accounts, studentId, setActiveAccount, isManagingFamily } =
    useActiveStudentContext();

  if (!isManagingFamily) return null;

  return (
    <fieldset
      className={styles.switcher}
      data-tone={tone === "onMedia" ? "onMedia" : undefined}
    >
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          className={styles.chip}
          data-selected={account.id === studentId ? "true" : undefined}
          onClick={() => setActiveAccount(account.id)}
          aria-pressed={account.id === studentId}
        >
          {account.isSelf ? "Me" : account.name.split(" ")[0] || account.name}
        </button>
      ))}
    </fieldset>
  );
}
