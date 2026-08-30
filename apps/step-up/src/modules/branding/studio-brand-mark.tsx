import { Text } from "@dev-ui/components/text";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useOptionalStudioId } from "@/lib/use-studio-id";
import styles from "./studio-brand-mark.module.scss";

type StudioBrandMarkResponse = {
  name: string;
  logoUrl?: string | null;
};

type StudioBrandMarkProps = {
  className?: string | undefined;
  labelClassName?: string | undefined;
  logoClassName?: string | undefined;
  fallbackLabel?: string | undefined;
};

export function StudioBrandMark({
  className,
  labelClassName,
  logoClassName,
  fallbackLabel = "classa",
}: StudioBrandMarkProps) {
  const api = useApi();
  const { user } = useAuth();
  const studioId = useOptionalStudioId();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<StudioBrandMarkResponse>(`/studios/${studioId}`),
    enabled: Boolean(user && studioId),
  });

  const name = studioQuery.data?.name?.trim() || fallbackLabel;
  const logoUrl = studioQuery.data?.logoUrl ?? null;

  return (
    <div className={className ?? styles.root}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={logoClassName ?? styles.logo}
        />
      ) : (
        <Text
          slot="label"
          data-sidebar-label=""
          className={labelClassName ?? styles.label}
        >
          {fallbackLabel}
        </Text>
      )}
    </div>
  );
}
