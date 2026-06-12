"use client";

import { SideRail } from "@/components/layout/SideRail";
import { TabBar } from "@/components/layout/TabBar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Mounts both navigation surfaces: the bottom tab bar (mobile) and the left
 * rail (lg+). Visibility is CSS-only so there is no hydration mismatch, and
 * the review-count badge state is fetched once for both.
 */
export function AppNav() {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/budget/review-count");
        if (res.ok) {
          const body = (await res.json()) as { count: number };
          setReviewCount(body.count);
        }
      } catch {
        /* ignore */
      }
    };
    void load();

    const onCount = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setReviewCount(detail);
    };
    window.addEventListener("budget-review-count", onCount);
    return () => window.removeEventListener("budget-review-count", onCount);
  }, [pathname]);

  if (pathname === "/login" || pathname.startsWith("/api")) {
    return null;
  }

  return (
    <>
      <TabBar pathname={pathname} reviewCount={reviewCount} />
      <SideRail pathname={pathname} reviewCount={reviewCount} />
    </>
  );
}
