import { useEffect, useRef, useCallback } from "react";

const ACTIVE_INTERVAL_MS = 2 * 60 * 1000;   // Every 2 min when tab is active
const HIDDEN_INTERVAL_MS = 5 * 60 * 1000;   // Every 5 min when tab is hidden

interface UseSessionValidatorOptions {
  isAuthenticated: boolean;
  validateFn: () => Promise<unknown>;
  onInvalid: () => void;
  storageKey?: string;
}

export function useSessionValidator({
  isAuthenticated,
  validateFn,
  onInvalid,
  storageKey = "app_session_logout",
}: UseSessionValidatorOptions): void {
  const onInvalidRef = useRef(onInvalid);
  useEffect(() => {
    onInvalidRef.current = onInvalid;
  });

  const validateFnRef = useRef(validateFn);
  useEffect(() => {
    validateFnRef.current = validateFn;
  });

  const broadcastLogout = useCallback(() => {
    try {
      localStorage.setItem(storageKey, Date.now().toString());
    } catch {
      // localStorage unavailable — ignore
    }
  }, [storageKey]);

  const validate = useCallback(async () => {
    try {
      await validateFnRef.current();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403 || !status) {
        broadcastLogout();
        onInvalidRef.current();
      }
    }
  }, [broadcastLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId: ReturnType<typeof setInterval>;

    function startInterval() {
      clearInterval(intervalId);
      const ms = document.hidden ? HIDDEN_INTERVAL_MS : ACTIVE_INTERVAL_MS;
      intervalId = setInterval(validate, ms);
    }

    startInterval();

    function handleVisibilityChange() {
      startInterval();
      if (!document.hidden) {
        validate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    function handleStorageEvent(e: StorageEvent) {
      if (e.key === storageKey && e.newValue) {
        onInvalidRef.current();
      }
    }

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [isAuthenticated, validate, storageKey]);
}
