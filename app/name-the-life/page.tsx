import { NameTheLifeFlow } from "@/components/life-plan/NameTheLifeFlow";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NameTheLifePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      <NameTheLifeFlow />
    </div>
  );
}
