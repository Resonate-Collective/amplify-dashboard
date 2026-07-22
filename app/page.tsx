import { auth, signOut } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <div className="wrap">
      <Dashboard userEmail={userEmail} signOutAction={signOutAction} />
    </div>
  );
}
