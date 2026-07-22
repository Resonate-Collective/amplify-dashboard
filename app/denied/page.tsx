import { signIn } from "@/lib/auth";

export default function DeniedPage() {
  return (
    <div className="center">
      <div className="card auth-card">
        <h1>Access restricted</h1>
        <p>
          This dashboard is limited to resonate.net Google accounts. If you think
          you should have access, ask Craig.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn" type="submit">
            Try a different account
          </button>
        </form>
      </div>
    </div>
  );
}
