import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { useToast } from "../../components/Toast.js";

type MaybeFactory<T, TData, TVariables> = T | ((data: TData, variables: TVariables) => T);

function resolve<T, TData, TVariables>(
  value: MaybeFactory<T, TData, TVariables>,
  data: TData,
  variables: TVariables
): T {
  return typeof value === "function"
    ? (value as (d: TData, v: TVariables) => T)(data, variables)
    : value;
}

interface ApiMutationOptions<TData, TError extends Error, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "onSuccess" | "onError"> {
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => unknown;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => unknown;
  successMessage?: MaybeFactory<string, TData, TVariables>;
  errorMessage?: MaybeFactory<string, TError, TVariables>;
}

export function useApiMutation<TData = unknown, TError extends Error = Error, TVariables = void, TContext = unknown>(
  options: ApiMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { showToast } = useToast();
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = options;

  return useMutation({
    ...rest,
    onSuccess(data, variables, context) {
      onSuccess?.(data, variables, context);
      if (successMessage) {
        showToast(resolve(successMessage, data, variables), "success");
      }
    },
    onError(error, variables, context) {
      onError?.(error, variables, context);
      const message = errorMessage
        ? resolve(errorMessage, error, variables)
        : error.message;
      showToast(message, "error");
    },
  });
}
