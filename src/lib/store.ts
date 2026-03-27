import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { CounterSet } from "./counter";

type StoreQueryKey = readonly [string];

const count = new CounterSet<QueryClient>();
const keys = new WeakMap<QueryClient, CounterSet<string>>();

export function emitStoreValue(key: StoreQueryKey, value: unknown) {
  for (const client of count.items()) {
    if (keys.get(client)?.has(key[0])) {
      client.setQueryData([key[0]], value);
    }
  }
}

export function useSubscribeStore(key: StoreQueryKey) {
  const client = useQueryClient();

  useEffect(() => {
    if (!keys.has(client)) {
      keys.set(client, new CounterSet<string>());
    }

    count.retain(client);
    keys.get(client)?.retain(key[0]);

    return () => {
      count.release(client);
      keys.get(client)?.release(key[0]);
    };
  }, [client]);
}
