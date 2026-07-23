import { useState } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./verify-email-banner.module.scss";

export function VerifyEmailBanner() {
  const {
    user,
    needsEmailVerification,
    resendEmailVerification,
    refreshEmailVerification,
  } = useAuth();
  const [pending, setPending] = useState<"resend" | "check" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"ok" | "error">("ok");

  if (!needsEmailVerification || !user) {
    return null;
  }

  const handleResend = async () => {
    setPending("resend");
    setFeedback(null);
    try {
      await resendEmailVerification();
      setFeedbackTone("ok");
      setFeedback("Verification email sent. Check your inbox.");
    } catch (error) {
      setFeedbackTone("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to send verification email.",
      );
    } finally {
      setPending(null);
    }
  };

  const handleCheck = async () => {
    setPending("check");
    setFeedback(null);
    try {
      const verified = await refreshEmailVerification();
      if (verified) {
        setFeedbackTone("ok");
        setFeedback("Email verified. You’re all set.");
        return;
      }
      setFeedbackTone("error");
      setFeedback("Not verified yet. Open the link from your email first.");
    } catch (error) {
      setFeedbackTone("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to check verification status.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={styles.stack} role="status">
      <div className={styles.banner}>
        <div className={styles.message}>
          <p>
            Confirm your email — we sent a link to {user.email}. Reset and
            notifications need a real inbox.
          </p>
          {feedback ? (
            <p
              className={styles.feedback}
              data-tone={feedbackTone}
              aria-live="polite"
            >
              {feedback}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            disabled={pending !== null}
            onClick={() => void handleResend()}
          >
            {pending === "resend" ? "Sending…" : "Resend"}
          </button>
          <button
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            disabled={pending !== null}
            onClick={() => void handleCheck()}
          >
            {pending === "check" ? "Checking…" : "I’ve verified"}
          </button>
        </div>
      </div>
    </div>
  );
}
