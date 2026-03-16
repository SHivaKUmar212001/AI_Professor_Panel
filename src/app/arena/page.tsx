import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import ArenaWorkspace from "@/components/arena/ArenaWorkspace";
import { authOptions } from "@/lib/auth";

export default async function ArenaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ArenaWorkspace />;
}
