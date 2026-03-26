import { QueryClient, useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/router-core";

import type { RouterContext } from "#/types";

import { AuthProvider } from "./provider";

const getAuthUserFn = createServerFn()
  .middleware([AuthProvider])
  .handler(async ({ context }) => {
    const response = await context.auth.getUser();
    return response.data;
  });

const AuthUserQueryKey = ["#!/auth"];

export function useAuthUserQuery() {
  return useQuery({
    queryKey: AuthUserQueryKey,
    queryFn: getAuthUserFn,
  });
}

export function fetchAuthUserQuery(client: QueryClient) {
  return client.fetchQuery({
    queryKey: AuthUserQueryKey,
    queryFn: getAuthUserFn,
  });
}

export function invalidateAuthUserQuery(client: QueryClient) {
  return client.invalidateQueries({
    queryKey: AuthUserQueryKey,
  });
}

export async function redirectIfSignedOut(context: RouterContext) {
  const data = await fetchAuthUserQuery(context.queryClient);
  if (!data.user) {
    throw redirect({ to: "/auth/login" });
  }
}

export async function redirectIfSignedIn(context: RouterContext) {
  const data = await fetchAuthUserQuery(context.queryClient);
  if (data.user) {
    throw redirect({ to: "/" });
  }
}
