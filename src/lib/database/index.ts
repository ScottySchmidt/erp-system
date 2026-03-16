import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function database() {
  return drizzle({
    client: postgres(env.DATABASE_URL),
    schema: schema,
  });
}

export { schema as t };
