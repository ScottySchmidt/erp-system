import { useSession } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

export type AppSessionData = {
  auth?: { name: string; value: string }[];
};

export function getAppSession() {
  return useSession<AppSessionData>({
    name: "app-session",
    password: env.APP_SECRET,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    },
  });
}
