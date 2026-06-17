import { LifePlanEditView } from "@/components/life-plan/LifePlanEditView";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function LifePlanEditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      <Suspense
        fallback={
          <p className="px-5 py-16 text-center text-sm text-ink-soft">
            Loading…
          </p>
        }
      >
        <LifePlanEditView />
      </Suspense>
    </div>
  );
}
