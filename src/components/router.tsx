import { useRouterState } from "@tanstack/react-router";
import clsx from "clsx";

export function RouteLoadingOverlay() {
  const state = useRouterState();

  return (
    <div
      className={clsx(
        "fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-md",
        "transition-[opacity,visibility] transition-discrete",
        !state.isLoading && "invisible opacity-0",
        state.isLoading && "visible opacity-100",
      )}
    >
      <div className="loading" />
    </div>
  );
}
