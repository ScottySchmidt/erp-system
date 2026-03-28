import { useQuery } from "@tanstack/react-query";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/router-core";

import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { getOrInitProfile } from "#/lib/server/auth";
import type { RouterContext } from "#/types";

import { emitStoreValue, useSubscribeStore } from "./store";

export const Authenticate = createMiddleware({ type: "function" })
  .middleware([DatabaseProvider, SupabaseProvider])
  .client(async ({ next }) => {
    const result = await next();

    // the context sent from the middleware itself is not inferred
    const { auth } = result.context as any;
    emitStoreValue(AuthInfoQueryKey, auth);

    return result;
  })
  .server(async ({ context, next }) => {
    const response = await context.supabase.auth.getUser();
    const identity = response.data.user;
    const profile = await getOrInitProfile(context.db, identity);

    return next({
      context: {
        auth: { identity, profile },
      },
      sendContext: {
        auth: { identity, profile },
      },
    });
  });

export const MustAuthenticate = createMiddleware({ type: "function" })
  .middleware([Authenticate])
  .server(async ({ next, context }) => {
    const { identity, profile } = context.auth;

    if (!identity || !profile) {
      throw new Error("User is not logged in");
    }

    return next({
      context: {
        auth: { identity, profile },
      },
    });
  });

const getAuthInfoFn = createServerFn()
  .middleware([Authenticate])
  .handler(({ context }) => context.auth);

const AuthInfoQueryKey = ["#!/auth"] as const;

export function useAuthInfoQuery() {
  useSubscribeStore(AuthInfoQueryKey);

  return useQuery({
    queryKey: AuthInfoQueryKey,
    queryFn: getAuthInfoFn,
    staleTime: Infinity,
  });
}

export async function redirectIfSignedOut(context: RouterContext) {
  const auth = await context.queryClient.fetchQuery({
    queryKey: AuthInfoQueryKey,
    queryFn: getAuthInfoFn,
    staleTime: Infinity,
  });

  if (!auth.identity) {
    throw redirect({ to: "/auth/login" });
  }
}

export async function redirectIfSignedIn(context: RouterContext) {
  const auth = await context.queryClient.fetchQuery({
    queryKey: AuthInfoQueryKey,
    queryFn: getAuthInfoFn,
    staleTime: Infinity,
  });

  if (auth.identity) {
    throw redirect({ to: "/dashboard" });
  }
}
