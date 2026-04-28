import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClientFormResponse, SaveClientFormRequest } from "@get-down/shared";
import { publicFetch } from "../client.js";

export function useClientForm(token: string) {
  return useQuery({
    queryKey: ["client-form", token],
    queryFn: () => publicFetch<ClientFormResponse>("GET", `/client-form/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useSaveClientForm(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveClientFormRequest) =>
      publicFetch<{ ok: true }>("PUT", `/client-form/${token}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-form", token] });
    },
  });
}
