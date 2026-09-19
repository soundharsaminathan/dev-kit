import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { DanceStylesEditor } from "./studio-dance-styles-editor";
import { SettingsSaveBar, SettingsSection } from "./ui";
import { useStudioDanceStyles } from "./use-studio-dance-styles";

export function StudioDanceStylesFormPage() {
  const editor = useStudioDanceStyles();
  const { studioQuery } = editor;

  if (studioQuery.isLoading) {
    return <SkeletonBlock height="12rem" radius="var(--radius-xl)" />;
  }

  if (studioQuery.isError) {
    return (
      <ErrorState
        description={
          studioQuery.error instanceof Error
            ? studioQuery.error.message
            : "Unable to load dance styles."
        }
        action={
          <TouchButton variant="primary" onClick={() => studioQuery.refetch()}>
            Try again
          </TouchButton>
        }
      />
    );
  }

  if (!studioQuery.data) {
    return (
      <EmptyState
        title="Studio not found"
        description="Unable to load dance styles."
      />
    );
  }

  return (
    <>
      <SettingsSection
        title="Catalog"
        description="Add the dance styles offered at this studio. Edit names, abbreviations, colors, and emoji."
      >
        <DanceStylesEditor
          styles={editor.styles}
          busy={editor.busy}
          onAdd={editor.addStyle}
          onRemove={editor.removeStyle}
          onMove={editor.moveStyle}
          onUpdate={editor.updateStyle}
        />
      </SettingsSection>

      <SettingsSaveBar
        isDirty={editor.isDirty}
        isPending={editor.busy}
        onCancel={editor.reset}
        onSave={editor.save}
        saveLabel="Save dance styles"
      />
    </>
  );
}
