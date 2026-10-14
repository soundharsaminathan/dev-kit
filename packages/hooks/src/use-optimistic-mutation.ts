import {
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from "@tanstack/react-query";

type OptimisticMutationContext<TSnapshot> = {
  snapshot: TSnapshot;
};

export type UseOptimisticMutationOptions<TData, TError, TVariables, TSnapshot> =
  {
    mutationFn: NonNullable<
      UseMutationOptions<TData, TError, TVariables>["mutationFn"]
    >;
    onOptimistic: (variables: TVariables) => Promise<TSnapshot> | TSnapshot;
    onRollback?: (
      snapshot: TSnapshot,
      variables: TVariables,
      error: TError,
    ) => void;
    onError?: (
      error: TError,
      variables: TVariables,
      context: OptimisticMutationContext<TSnapshot> | undefined,
    ) => void;
  } & Omit<
    UseMutationOptions<
      TData,
      TError,
      TVariables,
      OptimisticMutationContext<TSnapshot>
    >,
    "mutationFn" | "onMutate" | "onError"
  >;

export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TSnapshot = unknown,
>(
  options: UseOptimisticMutationOptions<TData, TError, TVariables, TSnapshot>,
): UseMutationResult<
  TData,
  TError,
  TVariables,
  OptimisticMutationContext<TSnapshot>
> {
  const {
    mutationFn,
    onOptimistic,
    onRollback,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options;

  return useMutation({
    ...rest,
    mutationFn,
    onMutate: async (variables) => {
      const snapshot = await onOptimistic(variables);
      return { snapshot };
    },
    onError: (error, variables, context) => {
      if (context && onRollback) {
        onRollback(context.snapshot, variables, error);
      }
      onError?.(error, variables, context);
    },
    ...(onSuccess ? { onSuccess } : {}),
    ...(onSettled ? { onSettled } : {}),
  });
}
