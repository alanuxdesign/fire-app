"use client";

import { useCallback, useRef, useState } from "react";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

type UsePullToRefreshOptions = {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
};

export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const canPull = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || refreshing) return;
      if (!canPull()) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [enabled, refreshing, canPull],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || !enabled || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      if (!canPull()) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(delta * 0.45, MAX_PULL_PX));
    },
    [enabled, refreshing, canPull],
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD_PX;
    setPullDistance(0);
    if (!shouldRefresh || !enabled || refreshing) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [pullDistance, enabled, refreshing, onRefresh]);

  const bind = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };

  return {
    bind,
    pullDistance,
    refreshing,
  };
}
