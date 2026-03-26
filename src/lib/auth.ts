import { QueryClient, useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/router-core";

import type { RouterContext } from "#/types";

import { AuthProvider } from "./provider";

const getAuthInfoFn = createServerFn()
  .middleware([AuthProvider])
  .handler(async ({ context }) => {
    const response = await context.auth.getUser();
    return response.data.user;
  });

const AuthInfoQueryKey = ["#!/auth/identity"] as const;

export function useAuthInfoQuery() {
  return useQuery({
    queryKey: AuthInfoQueryKey,
    queryFn: getAuthInfoFn,
  });
}

export function fetchAuthInfoQuery(client: QueryClient) {
  return client.fetchQuery({
    queryKey: AuthInfoQueryKey,
    queryFn: getAuthInfoFn,
  });
}

export function invalidateAuthInfoQuery(client: QueryClient) {
  return client.invalidateQueries({
    queryKey: AuthInfoQueryKey,
  });
}

export async function redirectIfSignedOut(context: RouterContext) {
  const info = await fetchAuthInfoQuery(context.queryClient);
  if (!info) {
    throw redirect({ to: "/auth/login" });
  }
}

export async function redirectIfSignedIn(context: RouterContext) {
  const info = await fetchAuthInfoQuery(context.queryClient);
  if (info) {
    throw redirect({ to: "/" });
  }
}
