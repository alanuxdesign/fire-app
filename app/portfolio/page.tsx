import { DemoBanner } from "@/components/portfolio/DemoBanner";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { auth, isDemoUser } from "@/lib/auth";

export default async function PortfolioPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  return (
    <>
      {isDemo ? <DemoBanner /> : null}
      <PortfolioView isDemo={isDemo} />
    </>
  );
}
