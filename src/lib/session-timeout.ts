import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { useQueryClient } from "@tanstack/react-query";

export interface SessionTimeoutRule {
  flow: "create-voucher" | "new-invoice" | "edit-invoice";
  timeoutMinutes: number;
  timeoutRedirectTo: "/invoice" | "/erp/dashboard";
}

export const SESSION_TIMEOUT_RULES: Record<
  "createVoucher" | "newInvoice" | "editInvoice",
  SessionTimeoutRule
> = {
  createVoucher: {
    flow: "create-voucher",
    timeoutMinutes: 15,
    timeoutRedirectTo: "/erp/dashboard",
  },
  newInvoice: {
    flow: "new-invoice",
    timeoutMinutes: 10,
    timeoutRedirectTo: "/invoice",
  },
  editInvoice: {
    flow: "edit-invoice",
    timeoutMinutes: 10,
    timeoutRedirectTo: "/invoice",
  },
};

export interface UseSessionTimeoutOptions {
  rule: SessionTimeoutRule;
  enabled?: boolean;
}

export interface UseSessionTimeoutResult {
  remainingSeconds: number;
  remainingLabel: string;
}

export interface UseGlobalSessionTimeoutOptions {
  timeoutMinutes?: number;
  enabled?: boolean;
}

export interface UseGlobalSessionTimeoutResult {
  remainingSeconds: number;
  showExpiryWarning: boolean;
  remainingLabel: string;
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

const sessionTimeoutLogoutFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .handler(async ({ context }) => {
    await context.supabase.auth.signOut();
  });

export function useGlobalInactivitySessionTimeout(options: UseGlobalSessionTimeoutOptions = {}) {
  const { timeoutMinutes = 5, enabled = true } = options;
  const router = useRouter();
  const queryClient = useQueryClient();
  const timerRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);
  const deadlineRef = useRef<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.max(1, timeoutMinutes) * 60,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutMs = Math.max(1, timeoutMinutes) * 60 * 1000;
    let disposed = false;

    const clearTimer = () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = undefined;
    };

    const clearIntervalTimer = () => {
      if (intervalRef.current !== undefined) {
        window.clearInterval(intervalRef.current);
      }
      intervalRef.current = undefined;
    };

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };

    const restartTimer = () => {
      clearTimer();
      deadlineRef.current = Date.now() + timeoutMs;
      updateRemaining();
      timerRef.current = window.setTimeout(() => {
        void (async () => {
          if (disposed) {
            return;
          }
          try {
            await sessionTimeoutLogoutFn({});
          } finally {
            await queryClient.invalidateQueries({ queryKey: ["#!/auth"] });
            await router.invalidate();
            await router.navigate({ to: "/", replace: true });
          }
        })();
      }, timeoutMs);
    };

    const onActivity = () => {
      restartTimer();
    };

    restartTimer();
    intervalRef.current = window.setInterval(updateRemaining, 1000);
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });

    return () => {
      disposed = true;
      clearTimer();
      clearIntervalTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
    };
  }, [enabled, router, queryClient, timeoutMinutes]);

  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingSeconds % 60).toString().padStart(2, "0");

  return {
    remainingSeconds,
    showExpiryWarning: enabled && remainingSeconds > 0 && remainingSeconds <= 60,
    remainingLabel: `${minutes}:${seconds}`,
  } satisfies UseGlobalSessionTimeoutResult;
}

export function useSessionTimeoutTracker(options: UseSessionTimeoutOptions) {
  const { rule, enabled = true } = options;
  const router = useRouter();
  const timerRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);
  const deadlineRef = useRef<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.max(1, rule.timeoutMinutes) * 60,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutMs = Math.max(1, rule.timeoutMinutes) * 60 * 1000;
    const startedAt = Date.now();
    let disposed = false;

    const clearTimer = () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = undefined;
    };

    const clearIntervalTimer = () => {
      if (intervalRef.current !== undefined) {
        window.clearInterval(intervalRef.current);
      }
      intervalRef.current = undefined;
    };

    const updateRemaining = () => {
      const deadline = startedAt + timeoutMs;
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };

    deadlineRef.current = startedAt + timeoutMs;
    updateRemaining();
    timerRef.current = window.setTimeout(() => {
      void (async () => {
        if (disposed) {
          return;
        }
        await router.navigate({ to: rule.timeoutRedirectTo, replace: true });
      })();
    }, timeoutMs);

    intervalRef.current = window.setInterval(updateRemaining, 1000);

    return () => {
      disposed = true;
      clearTimer();
      clearIntervalTimer();
    };
  }, [enabled, router, rule.flow, rule.timeoutMinutes, rule.timeoutRedirectTo]);

  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingSeconds % 60).toString().padStart(2, "0");

  return {
    remainingSeconds,
    remainingLabel: `${minutes}:${seconds}`,
  } satisfies UseSessionTimeoutResult;
}
