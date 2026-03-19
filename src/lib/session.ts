import { useSession } from "@tanstack/react-start/server";

type AppSessionData = {
  auth_session_id?: string;
};

export function useAppSession() {
  return useSession<AppSessionData>({
    name: "app-session",
    password: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    },
  });
}
