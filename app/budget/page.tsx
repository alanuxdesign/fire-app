import { BudgetView } from "@/components/budget/BudgetView";
import { auth, isDemoUser } from "@/lib/auth";

export default async function BudgetPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  return <BudgetView isDemo={isDemo} />;
}
