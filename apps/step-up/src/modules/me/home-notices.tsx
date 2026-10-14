import { useToastContext } from "@dev-ui/components/toast";
import { Icon, type IconName } from "@dev-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { HomeMembership } from "@/modules/me/home-types";
import { BloomMenu, type BloomMenuItem } from "@/modules/ui/bloom-menu";
import styles from "./home-notices.module.scss";

export type HomeNoticeTone = "warning" | "info" | "danger";

export type HomeNoticeAction = BloomMenuItem & {
  run: () => void | Promise<void>;
};

export type HomeNotice = {
  id: string;
  tone?: HomeNoticeTone;
  icon?: IconName;
  title: string;
  summary: string;
  detail: string;
  menuLabel?: string;
  actions: HomeNoticeAction[];
};

type HomeNoticesProps = {
  notices: HomeNotice[];
  flushHero?: boolean;
};

function toneIcon(tone: HomeNoticeTone | undefined): IconName {
  if (tone === "danger") return "alert-circle";
  if (tone === "info") return "bell";
  return "alert-circle";
}

export function HomeNotices({ notices, flushHero = false }: HomeNoticesProps) {
  const { toast } = useToastContext("HomeNotices");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (notices.length === 0) {
    return null;
  }

  async function runAction(noticeId: string, action: HomeNoticeAction) {
    setBusyId(`${noticeId}:${action.id}`);
    try {
      await action.run();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className={styles.stack}
      data-flush-hero={flushHero ? "true" : undefined}
      aria-label="Alerts"
    >
      {notices.map((notice) => {
        const tone = notice.tone ?? "warning";
        const icon = notice.icon ?? toneIcon(tone);
        const menuTone = tone === "info" ? "primary" : "danger";
        const menuItems: BloomMenuItem[] = notice.actions.map(
          ({ id, label, icon: itemIcon }) => ({
            id,
            label: busyId === `${notice.id}:${id}` ? "Working…" : label,
            ...(itemIcon ? { icon: itemIcon } : {}),
          }),
        );

        return (
          <div
            key={notice.id}
            className={styles.row}
            data-tone={tone}
            role="status"
          >
            <span className={styles.icon} aria-hidden>
              <Icon name={icon} />
            </span>
            <div className={styles.copy}>
              <p className={styles.title}>{notice.title}</p>
              <p className={styles.summary}>{notice.summary}</p>
            </div>
            <BloomMenu
              className={styles.menu}
              items={menuItems}
              columns={1}
              size="compact"
              tone={menuTone}
              triggerLabel={notice.menuLabel ?? "Details"}
              triggerIcon={null}
              panelTitle={notice.title}
              description={notice.detail}
              onSelect={(id) => {
                const action = notice.actions.find((item) => item.id === id);
                if (!action || busyId) return;
                void runAction(notice.id, action);
              }}
            />
          </div>
        );
      })}
    </section>
  );
}

type UseHomeNoticesOptions = {
  membership?: HomeMembership | null;
};

export function useHomeNotices({
  membership = null,
}: UseHomeNoticesOptions = {}): HomeNotice[] {
  const {
    user,
    needsEmailVerification,
    resendEmailVerification,
    refreshEmailVerification,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToastContext("useHomeNotices");

  return useMemo(() => {
    const notices: HomeNotice[] = [];

    if (needsEmailVerification && user?.email) {
      notices.push({
        id: "verify-email",
        tone: "danger",
        icon: "mail",
        title: "Confirm your email",
        summary: user.email,
        detail: `We sent a verification link to ${user.email}. Confirm it so password resets and notifications reach you.`,
        menuLabel: "Fix",
        actions: [
          {
            id: "resend",
            label: "Resend email",
            icon: "mail",
            run: async () => {
              await resendEmailVerification();
              toast({
                title: "Verification email sent",
                description: "Check your inbox and spam folder.",
              });
            },
          },
          {
            id: "check",
            label: "I’ve verified",
            icon: "shield",
            run: async () => {
              const verified = await refreshEmailVerification();
              if (verified) {
                toast({
                  title: "Email verified",
                  description: "You’re all set.",
                });
                return;
              }
              toast({
                title: "Not verified yet",
                description: "Open the link from your email first.",
                variant: "error",
              });
            },
          },
        ],
      });
    }

    if (membership?.needsRenewal) {
      const plan = membership.subscriptionName ?? "your plan";
      const due = new Date(membership.periodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      notices.push({
        id: "membership-renewal",
        tone: "warning",
        icon: "credit-card",
        title: "Plan renewal due",
        summary: `${plan} · by ${due}`,
        detail: `${plan} renews around ${due}. Renew now so you don’t lose your spot in class.`,
        menuLabel: "Pay",
        actions: [
          {
            id: "renew",
            label: "Renew plan",
            icon: "wallet",
            run: () => {
              void navigate({ to: "/me/subscriptions" });
            },
          },
        ],
      });
    }

    return notices;
  }, [
    membership,
    navigate,
    needsEmailVerification,
    refreshEmailVerification,
    resendEmailVerification,
    toast,
    user?.email,
  ]);
}
