import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionValidator } from "./useSessionValidator";

describe("useSessionValidator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not validate when not authenticated", () => {
    const validateFn = vi.fn().mockResolvedValue({});
    const onInvalid = vi.fn();

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: false,
        validateFn,
        onInvalid,
      })
    );

    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(validateFn).not.toHaveBeenCalled();
  });

  it("validates periodically when authenticated", async () => {
    const validateFn = vi.fn().mockResolvedValue({});
    const onInvalid = vi.fn();

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
      })
    );

    // First interval fires at 2 minutes (ACTIVE_INTERVAL_MS)
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(validateFn).toHaveBeenCalledTimes(1);
  });

  it("calls onInvalid when validateFn throws 401", async () => {
    const validateFn = vi.fn().mockRejectedValue({ status: 401 });
    const onInvalid = vi.fn();

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(onInvalid).toHaveBeenCalledTimes(1);
  });

  it("does not call onInvalid on 500 errors (transient)", async () => {
    const validateFn = vi.fn().mockRejectedValue({ status: 500 });
    const onInvalid = vi.fn();

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(onInvalid).not.toHaveBeenCalled();
  });

  it("broadcasts logout to localStorage", async () => {
    const validateFn = vi.fn().mockRejectedValue({ status: 401 });
    const onInvalid = vi.fn();

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
        storageKey: "test_logout",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(localStorage.getItem("test_logout")).not.toBeNull();
  });

  it("responds to cross-tab logout events", () => {
    const onInvalid = vi.fn();
    const validateFn = vi.fn().mockResolvedValue({});

    renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
        storageKey: "test_logout",
      })
    );

    // Simulate storage event from another tab
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "test_logout",
          newValue: Date.now().toString(),
        })
      );
    });

    expect(onInvalid).toHaveBeenCalledTimes(1);
  });

  it("cleans up on unmount", () => {
    const validateFn = vi.fn().mockResolvedValue({});
    const onInvalid = vi.fn();

    const { unmount } = renderHook(() =>
      useSessionValidator({
        isAuthenticated: true,
        validateFn,
        onInvalid,
      })
    );

    unmount();

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(validateFn).not.toHaveBeenCalled();
  });
});
