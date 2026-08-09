import { FileTrigger } from "@dev-ui/components/file-trigger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./media-manager.module.scss";
import {
  type BranchMedia,
  type BranchMediaCategory,
  MEDIA_CATEGORY_LABELS,
  type StudioBranch,
} from "./types";
import {
  MAX_BRANCH_IMAGES,
  MAX_BRANCH_VIDEOS,
  uploadBranchMediaFiles,
} from "./upload";

type MediaManagerProps = {
  branchId: string;
  media: BranchMedia[];
  coverMediaId: string | null;
};

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

function MediaMetaFields({
  item,
  onSave,
}: {
  item: BranchMedia;
  onSave: (body: { caption?: string | null; altText?: string | null }) => void;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const [altText, setAltText] = useState(item.altText ?? "");

  return (
    <>
      <FormInput
        label="Caption"
        value={caption}
        onChange={setCaption}
        onBlur={() => {
          const next = caption.trim() || null;
          if (next !== (item.caption ?? null)) {
            onSave({ caption: next });
          }
        }}
      />
      <FormInput
        label="Alt text"
        value={altText}
        onChange={setAltText}
        onBlur={() => {
          const next = altText.trim() || null;
          if (next !== (item.altText ?? null)) {
            onSave({ altText: next });
          }
        }}
      />
    </>
  );
}

export function MediaManager({
  branchId,
  media,
  coverMediaId,
}: MediaManagerProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("MediaManager");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<"mobile" | "desktop">("mobile");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const active = useMemo(
    () => media.filter((item) => !item.archivedAt),
    [media],
  );
  const imageCount = active.filter((item) => item.kind === "IMAGE").length;
  const videoCount = active.filter((item) => item.kind === "VIDEO").length;

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["branch", branchId] }),
      queryClient.invalidateQueries({
        queryKey: ["branch-landing", branchId],
      }),
      queryClient.invalidateQueries({ queryKey: ["branches"] }),
    ]);
  }

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch<StudioBranch>(`/branches/${branchId}/media/reorder`, {
        orderedIds,
      }),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Gallery reordered",
        description: "Media order updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t reorder gallery",
        description:
          error instanceof Error ? error.message : "Could not reorder media.",
        variant: "error",
      });
    },
  });

  const setCover = useMutation({
    mutationFn: (mediaId: string) =>
      api.patch<StudioBranch>(`/branches/${branchId}/cover`, { mediaId }),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Cover updated",
        description: "Gallery cover image set.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t set cover",
        description:
          error instanceof Error ? error.message : "Could not set cover.",
        variant: "error",
      });
    },
  });

  const updateMedia = useMutation({
    mutationFn: ({
      mediaId,
      body,
    }: {
      mediaId: string;
      body: Record<string, unknown>;
    }) => api.patch(`/branches/${branchId}/media/${mediaId}`, body),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Media updated",
        description: "Gallery item saved.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t update media",
        description:
          error instanceof Error ? error.message : "Could not update media.",
        variant: "error",
      });
    },
  });

  const deleteMedia = useMutation({
    mutationFn: (mediaId: string) =>
      api.delete(`/branches/${branchId}/media/${mediaId}`),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Media deleted",
        description: "Gallery item removed.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t delete media",
        description:
          error instanceof Error ? error.message : "Could not delete media.",
        variant: "error",
      });
    },
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadBranchMediaFiles(api, files, {
        images: imageCount,
        videos: videoCount,
      });
      await api.post(`/branches/${branchId}/media`, {
        items: uploaded.map((item) => ({
          objectKey: item.objectKey,
          kind: item.kind,
        })),
      });
      await invalidate();
      toast({
        title: "Upload complete",
        description: "Photos and videos added to the gallery.",
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setUploadError(message);
      toast({
        title: "Couldn’t upload media",
        description: message,
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  function onDropReorder(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = moveItem(active, dragIndex, targetIndex);
    setDragIndex(null);
    reorder.mutate(next.map((item) => item.id));
  }

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Gallery</h2>
          <p className={styles.help}>
            {imageCount}/{MAX_BRANCH_IMAGES} images · {videoCount}/
            {MAX_BRANCH_VIDEOS} videos · muted promos only
          </p>
        </div>
        <fieldset className={styles.previewToggle} aria-label="Preview size">
          <button
            type="button"
            data-active={preview === "mobile" ? "true" : undefined}
            onClick={() => setPreview("mobile")}
          >
            Mobile
          </button>
          <button
            type="button"
            data-active={preview === "desktop" ? "true" : undefined}
            onClick={() => setPreview("desktop")}
          >
            Desktop
          </button>
        </fieldset>
      </div>

      <div className={styles.uploadRow}>
        <FileTrigger
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          allowsMultiple
          isDisabled={uploading}
          onSelect={(files) => {
            void handleUpload(files);
          }}
        >
          <TouchButton variant="default" isPending={uploading}>
            {uploading ? "Uploading…" : "Add photos & videos"}
          </TouchButton>
        </FileTrigger>
      </div>

      {uploadError ? <p className={styles.error}>{uploadError}</p> : null}

      <section
        className={styles.grid}
        data-preview={preview}
        aria-label="Reorderable gallery"
      >
        {active.map((item, index) => (
          <article
            key={item.id}
            className={styles.card}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDropReorder(index)}
            data-cover={coverMediaId === item.id ? "true" : undefined}
          >
            <div className={styles.thumb}>
              {item.kind === "VIDEO" ? (
                <video src={item.url} muted playsInline preload="metadata" />
              ) : (
                <img src={item.url} alt={item.altText || ""} />
              )}
              {item.kind === "VIDEO" ? (
                <span className={styles.badge}>Video</span>
              ) : null}
              {coverMediaId === item.id ? (
                <span className={styles.coverBadge}>Cover</span>
              ) : null}
            </div>

            <MediaMetaFields
              key={item.id}
              item={item}
              onSave={(body) => updateMedia.mutate({ mediaId: item.id, body })}
            />

            <div className={styles.selectLabel}>
              <span>Category</span>
              <Select
                selectedKey={item.category}
                onSelectionChange={(key) => {
                  if (!key) return;
                  updateMedia.mutate({
                    mediaId: item.id,
                    body: { category: String(key) as BranchMediaCategory },
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIA_CATEGORY_LABELS).map(([id, label]) => (
                    <SelectItem key={id} id={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles.cardActions}>
              {item.kind === "IMAGE" ? (
                <TouchButton
                  size="sm"
                  variant="default"
                  isDisabled={coverMediaId === item.id}
                  onClick={() => setCover.mutate(item.id)}
                >
                  Set cover
                </TouchButton>
              ) : null}
              <TouchButton
                size="sm"
                variant="quiet"
                onClick={() =>
                  updateMedia.mutate({
                    mediaId: item.id,
                    body: { archived: true },
                  })
                }
              >
                Archive
              </TouchButton>
              <TouchButton
                size="sm"
                variant="quiet"
                onClick={() => {
                  if (window.confirm("Delete this media item?")) {
                    deleteMedia.mutate(item.id);
                  }
                }}
              >
                Delete
              </TouchButton>
            </div>
          </article>
        ))}
      </section>

      {active.length === 0 ? (
        <p className={styles.help}>
          Upload studio photos and short muted promo videos. Drag cards to
          reorder.
        </p>
      ) : null}
    </section>
  );
}
