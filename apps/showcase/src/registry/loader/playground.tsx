import { Loader } from "@dev-ui/components/loader";

type LoaderPlaygroundProps = {
  variant?: "spinner" | "ring";
};

export default function LoaderPlayground({
  variant = "spinner",
}: LoaderPlaygroundProps = {}) {
  return <Loader variant={variant} />;
}
