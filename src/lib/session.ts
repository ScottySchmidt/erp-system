import { createServerFn } from "@tanstack/react-start";

import { getAppSession } from "#/lib/server/session";
import type { RouterContext } from "#/types";

const getAppSessionFn = createServerFn().handler(async () => {
  const session = await getAppSession();
  return session.data;
});

const AppSessionQueryKey = ["#!/app-session"];

export function fetchAppSessionQuery(context: RouterContext) {
  return context.queryClient.fetchQuery({
    queryKey: AppSessionQueryKey,
    queryFn: getAppSessionFn,
  });
}

export function invalidateAppSessionQuery(context: RouterContext) {
  return context.queryClient.invalidateQueries({
    queryKey: AppSessionQueryKey,
  });
}
