import { SproutVessel } from "@/components/illustrations/SproutVessel";

export default function PlannerPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-paper px-8 text-center">
      <SproutVessel stage={1} className="h-16 w-16" />
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight text-ink">
          The planner is still taking root
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
          Soon you&apos;ll be able to sketch the path ahead — coast, lean, and full
          freedom. For now, your garden keeps growing on its own.
        </p>
      </div>
    </div>
  );
}
