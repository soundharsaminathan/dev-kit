import { Empty, EmptyDescription, EmptyTitle } from "@dev-ui/components/empty";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
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
  const query = useQuery({
    queryKey: ["batches", "trainer-profile", STUDIO_ID, trainerId],
    queryFn: () =>
      api.get<DiscoverBatch[]>(
        `/batches/studio/${STUDIO_ID}?${new URLSearchParams({
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

export function ProfileTabs({
  profile,
  detailTo = "/me/batches/$id",
}: ProfileTabsProps) {
  const isTrainer = profile.role === "TRAINER";

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
      defaultSelectedKey="batches"
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

      <TabPanel id="batches" className={styles.panel}>
        <TrainerBatchesPanel trainerId={profile.id} detailTo={detailTo} />
      </TabPanel>
      <TabPanel id="posts" className={styles.panel}>
        <PostsPanel profile={profile} />
      </TabPanel>
      <TabPanel id="contact" className={styles.panel}>
        <ContactPanel profile={profile} />
      </TabPanel>
    </Tabs>
  );
}
