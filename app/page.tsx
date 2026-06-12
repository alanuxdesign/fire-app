import { HomeView } from "@/components/home/HomeView";
import { auth, isDemoUser } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  return <HomeView isDemo={isDemo} />;
}
