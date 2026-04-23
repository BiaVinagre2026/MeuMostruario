import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInactivityLogout } from "./useInactivityLogout";

describe("useInactivityLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not start timer when not authenticated", () => {
    const onExpire = vi.fn();
    renderHook(() => useInactivityLogout(false, onExpire));

    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("fires onExpire after 15 minutes of inactivity", () => {
    const onExpire = vi.fn();
    renderHook(() => useInactivityLogout(true, onExpire));

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("resets timer on user activity", () => {
    const onExpire = vi.fn();
    renderHook(() => useInactivityLogout(true, onExpire));

    // Advance 14 minutes
    vi.advanceTimersByTime(14 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();

    // Simulate user activity
    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });

    // Advance another 14 minutes (timer was reset)
    vi.advanceTimersByTime(14 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();

    // Full 15 minutes since last activity
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("cleans up on unmount", () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useInactivityLogout(true, onExpire));

    unmount();

    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("cleans up when authentication changes to false", () => {
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ isAuth }) => useInactivityLogout(isAuth, onExpire),
      { initialProps: { isAuth: true } }
    );

    // Deauthenticate
    rerender({ isAuth: false });

    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
