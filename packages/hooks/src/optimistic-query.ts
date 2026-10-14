import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type QuerySnapshot<TData> = {
  queryKey: QueryKey;
  previous: TData | undefined;
};

export async function captureQuerySnapshot<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<QuerySnapshot<TData>> {
  await queryClient.cancelQueries({ queryKey });
  return {
    queryKey,
    previous: queryClient.getQueryData<TData>(queryKey),
  };
}

export function restoreQuerySnapshot<TData>(
  queryClient: QueryClient,
  snapshot: QuerySnapshot<TData>,
) {
  queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
}
