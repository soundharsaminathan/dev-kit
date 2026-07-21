import { Button } from "@dev-ui/components/button";
import { Field, Label } from "@dev-ui/components/field";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Text } from "@dev-ui/components/text";
import { TextArea } from "@dev-ui/components/text-area";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import styles from "./compose-post.module.scss";
import { MAX_POST_IMAGES, uploadPostPhotos } from "./upload";

type ComposePostProps = {
  onCreated?: () => void;
};

export function ComposePost({ onCreated }: ComposePostProps) {
  const api = useApi();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSelect(selected: FileList | null) {
    if (!selected?.length) {
      return;
    }
    const next = Array.from(selected).slice(0, MAX_POST_IMAGES);
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setError(null);
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("Add at least one photo.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const imageUrls = await uploadPostPhotos(api, files);
      await api.post("/posts", {
        imageUrls,
        caption: caption.trim() || undefined,
      });
      setFiles([]);
      setPreviews([]);
      setCaption("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create post.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <FileTrigger
          accept="image/jpeg,image/png,image/webp,image/gif"
          allowsMultiple
          onSelect={handleSelect}
        >
          <Button variant="default" isDisabled={pending}>
            Choose photos
          </Button>
        </FileTrigger>
        <Button
          variant="primary"
          isPending={pending}
          isDisabled={files.length === 0}
          onClick={handleSubmit}
        >
          Post
        </Button>
      </div>

      {previews.length > 0 ? (
        <div className={styles.previews}>
          {previews.map((src) => (
            <img key={src} src={src} alt="" className={styles.preview} />
          ))}
        </div>
      ) : (
        <Text slot="description">Share photos with people who follow you.</Text>
      )}

      <Field>
        <Label>Caption</Label>
        <TextArea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Optional caption"
          rows={3}
        />
      </Field>

      {error ? <Text className={styles.error}>{error}</Text> : null}
    </div>
  );
}
