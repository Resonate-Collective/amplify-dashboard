import { signIn } from "@/lib/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl || "/";
  return (
    <div className="center">
      <div className="card auth-card">
        <h1>Amplify effectiveness dashboard</h1>
        <p>Sign in with your resonate.net Google account to continue.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button className="btn btn-primary" type="submit">
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
