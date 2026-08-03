import { Empty, EmptyDescription, EmptyTitle } from "@dev-ui/components/empty";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { motion, type PanInfo, useReducedMotion } from "motion/react";
import { type TouchEvent, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import { type DiscoverBatch, toBatchCardData } from "@/modules/discover/types";
import { BatchCard } from "@/modules/ui/batch-card";
import { EmptyState } from "@/modules/ui/states";
import { PostGrid } from "./post-grid";
import styles from "./profile-tabs.module.scss";
import type { SocialProfile } from "./types";

type ProfileTabsProps = {
  profile: SocialProfile;
  detailTo?: "/me/batches/$id" | "/app/batches/$id";
};

const TRAINER_TAB_KEYS = ["batches", "posts", "contact"] as const;
type TrainerTabKey = (typeof TRAINER_TAB_KEYS)[number];

const SWIPE_DRAG = 56;
const SWIPE_VELOCITY = 450;

type TouchOrigin = {
  x: number;
  y: number;
};

function formatInstagramLabel(url: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      return path.replace(/^\//, "");
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ContactPanel({ profile }: { profile: SocialProfile }) {
  const phone = profile.phone?.trim() || null;
  const instagramHref = profile.instagramUrl
    ? normalizeExternalUrl(profile.instagramUrl)
    : null;
  const hasContact = Boolean(phone || instagramHref || profile.styles.length);

  if (!hasContact) {
    return (
      <div className={styles.panelEmpty}>
        <Empty>
          <EmptyTitle>No contact info</EmptyTitle>
          <EmptyDescription>
            This trainer has not shared contact details yet.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className={styles.contact}>
      {phone ? (
        <a className={styles.contactRow} href={`tel:${phone}`}>
          <span className={styles.contactIcon} aria-hidden>
            <Icon name="smartphone" />
          </span>
          <span className={styles.contactCopy}>
            <span className={styles.contactLabel}>Phone</span>
            <span className={styles.contactValue}>{phone}</span>
          </span>
        </a>
      ) : null}

      {instagramHref ? (
        <a
          className={styles.contactRow}
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.contactIcon} aria-hidden>
            <Icon name="link" />
          </span>
          <span className={styles.contactCopy}>
            <span className={styles.contactLabel}>Instagram</span>
            <span className={styles.contactValue}>
              {formatInstagramLabel(profile.instagramUrl!)}
            </span>
          </span>
        </a>
      ) : null}

      {profile.styles.length > 0 ? (
        <div className={styles.contactStyles}>
          <p className={styles.contactLabel}>Styles</p>
          <ul className={styles.styleChips}>
            {profile.styles.map((style) => (
              <li key={style} className={styles.styleChip}>
                {style}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TrainerBatchesPanel({
  trainerId,
  detailTo,
}: {
  trainerId: string;
  detailTo: "/me/batches/$id" | "/app/batches/$id";
}) {
  const api = useApi();
  const studioId = useStudioId();
  const query = useQuery({
    queryKey: ["batches", "trainer-profile", studioId, trainerId],
    queryFn: () =>
      api.get<DiscoverBatch[]>(
        `/batches/studio/${studioId}?${new URLSearchParams({
          activeOnly: "true",
          trainerId,
        }).toString()}`,
      ),
  });

  if (query.isLoading) {
    return (
      <div className={styles.batches}>
        {["a", "b", "c"].map((id) => (
          <div key={id} className={styles.batchSkeleton} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={ENTITY_ICONS.batch}
        title="Could not load batches"
        description={
          query.error instanceof Error
            ? query.error.message
            : "Try again in a moment."
        }
      />
    );
  }

  const batches = query.data ?? [];
  if (batches.length === 0) {
    return (
      <div className={styles.panelEmpty}>
        <Empty>
          <EmptyTitle>No batches yet</EmptyTitle>
          <EmptyDescription>
            Classes taught by this trainer will show up here.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className={styles.batches}>
      {batches.map((batch) => (
        <BatchCard
          key={batch.id}
          batch={toBatchCardData(batch)}
          detailTo={detailTo}
        />
      ))}
    </div>
  );
}

function PostsPanel({ profile }: { profile: SocialProfile }) {
  if (profile.posts.length === 0) {
    return (
      <div className={styles.panelEmpty}>
        <Empty>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>
            {profile.isOwnProfile
              ? "Share your first photo from the feed."
              : "This profile has not posted yet."}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return <PostGrid posts={profile.posts} />;
}

function isTrainerTabKey(key: string): key is TrainerTabKey {
  return (TRAINER_TAB_KEYS as readonly string[]).includes(key);
}

function nextTabKey(
  current: TrainerTabKey,
  direction: -1 | 1,
): TrainerTabKey | null {
  const index = TRAINER_TAB_KEYS.indexOf(current);
  const next = index + direction;
  if (next < 0 || next >= TRAINER_TAB_KEYS.length) return null;
  return TRAINER_TAB_KEYS[next] ?? null;
}

function tabFromSwipe(
  current: string,
  offsetX: number,
  offsetY: number,
  velocityX = 0,
): TrainerTabKey | null {
  if (!isTrainerTabKey(current)) return null;

  const horizontal =
    Math.abs(offsetX) >= Math.abs(offsetY) ||
    Math.abs(velocityX) >= SWIPE_VELOCITY;
  if (!horizontal) return null;

  let direction: -1 | 1 | null = null;
  if (offsetX < -SWIPE_DRAG || velocityX < -SWIPE_VELOCITY) {
    direction = 1;
  } else if (offsetX > SWIPE_DRAG || velocityX > SWIPE_VELOCITY) {
    direction = -1;
  }
  if (!direction) return null;
  return nextTabKey(current, direction);
}

export function ProfileTabs({
  profile,
  detailTo = "/me/batches/$id",
}: ProfileTabsProps) {
  const isTrainer = profile.role === "TRAINER";
  const reducedMotion = useReducedMotion();
  const [selectedKey, setSelectedKey] = useState<TrainerTabKey>("batches");
  const touchOrigin = useRef<TouchOrigin | null>(null);

  function applySwipe(offsetX: number, offsetY: number, velocityX = 0) {
    const next = tabFromSwipe(selectedKey, offsetX, offsetY, velocityX);
    if (next) setSelectedKey(next);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    applySwipe(info.offset.x, info.offset.y, info.velocity.x);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!reducedMotion) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchOrigin.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!reducedMotion || !touchOrigin.current) return;
    const touch = event.changedTouches[0];
    if (!touch) {
      touchOrigin.current = null;
      return;
    }
    applySwipe(
      touch.clientX - touchOrigin.current.x,
      touch.clientY - touchOrigin.current.y,
    );
    touchOrigin.current = null;
  }

  if (!profile.canViewContent) {
    return (
      <div className={styles.panelEmpty}>
        <Empty>
          <EmptyTitle>This account is private</EmptyTitle>
          <EmptyDescription>
            Follow this account to see their photos.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  if (!isTrainer) {
    return <PostsPanel profile={profile} />;
  }

  return (
    <Tabs
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        const next = String(key);
        if (isTrainerTabKey(next)) setSelectedKey(next);
      }}
      aria-label="Trainer profile sections"
      className={styles.tabs}
    >
      <TabList className={styles.tabList} variant="line">
        <Tab id="batches" className={styles.tab}>
          <Icon name="layout-grid" className={styles.tabIcon} aria-hidden />
          <span>Batches</span>
        </Tab>
        <Tab id="posts" className={styles.tab}>
          <Icon name="image" className={styles.tabIcon} aria-hidden />
          <span>Posts</span>
        </Tab>
        <Tab id="contact" className={styles.tab}>
          <Icon name="info" className={styles.tabIcon} aria-hidden />
          <span>Contact</span>
        </Tab>
      </TabList>

      <motion.div
        className={styles.swipeArea}
        drag={reducedMotion ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <TabPanel id="batches" className={styles.panel}>
          <TrainerBatchesPanel trainerId={profile.id} detailTo={detailTo} />
        </TabPanel>
        <TabPanel id="posts" className={styles.panel}>
          <PostsPanel profile={profile} />
        </TabPanel>
        <TabPanel id="contact" className={styles.panel}>
          <ContactPanel profile={profile} />
        </TabPanel>
      </motion.div>
    </Tabs>
  );
}
