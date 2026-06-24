import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dev-ui/components/empty";

type EmptyPlaygroundProps = {
  title?: string;
  description?: string;
  mediaVariant?: "default" | "icon";
  actionLabel?: string;
  showAction?: boolean;
};

export default function EmptyPlayground({
  title = "No projects yet",
  description = "Create your first project to get started.",
  mediaVariant = "icon",
  actionLabel = "Create project",
  showAction = true,
}: EmptyPlaygroundProps = {}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant={mediaVariant}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              strokeWidth="2"
            />
          </svg>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {showAction ? (
        <EmptyContent>
          <button type="button">{actionLabel}</button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
