import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "@/components/layout/Header";
import AuthForm from "@/components/auth/AuthForm";
import { authOptions } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/setup/agents");
  }

  return (
    <div className="min-h-screen pb-10">
      <Header />
      <main className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
        <AuthForm mode="register" />
      </main>
    </div>
  );
}
