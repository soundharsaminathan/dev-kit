import { Button } from "@dev-ui/components/button";
import type { ToastPosition, ToastVariant } from "@dev-ui/components/toast";
import { ToastProvider, useToastContext } from "@dev-ui/components/toast";

type ToastPlaygroundProps = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  timeout?: number;
  showAction?: boolean;
  actionLabel?: string;
};

function ToastDemo({
  title,
  description,
  variant,
  timeout,
  showAction,
  actionLabel,
}: ToastPlaygroundProps) {
  const { toast } = useToastContext("ToastDemo");

  return (
    <Button
      onClick={() =>
        toast(
          {
            title: title ?? "Files uploaded",
            description: description ?? "",
            variant: variant ?? "neutral",
            ...(showAction && actionLabel
              ? {
                  action: {
                    label: actionLabel,
                    onPress: () => undefined,
                  },
                }
              : {}),
          },
          { timeout: timeout ?? 5000 },
        )
      }
    >
      Show toast
    </Button>
  );
}

export default function ToastPlayground({
  title = "Files uploaded",
  description = "3 files uploaded successfully.",
  variant = "neutral",
  position = "bottom-right",
  timeout = 5000,
  showAction = false,
  actionLabel = "Install",
}: ToastPlaygroundProps = {}) {
  return (
    <ToastProvider position={position}>
      <ToastDemo
        title={title}
        description={description}
        variant={variant}
        timeout={timeout}
        showAction={showAction}
        actionLabel={actionLabel}
      />
    </ToastProvider>
  );
}
