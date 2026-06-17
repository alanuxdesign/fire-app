import { PlannerView } from "@/components/planner/PlannerView";
import { Suspense } from "react";

export default function PlannerPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-ink-soft">
            Loading…
          </div>
        }
      >
        <PlannerView />
      </Suspense>
    </div>
  );
}
