import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";

type AlertPlaygroundProps = {
  variant?: "neutral" | "danger" | "warning" | "info" | "success";
};

export default function AlertPlayground({
  variant = "neutral",
}: AlertPlaygroundProps = {}) {
  return (
    <Alert variant={variant}>
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version is ready to install.</AlertDescription>
    </Alert>
  );
}
