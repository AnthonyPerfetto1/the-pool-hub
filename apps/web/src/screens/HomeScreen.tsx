import { useAuth } from "../auth/useAuth";

export function HomeScreen() {
  const { session, signOut } = useAuth();

  return (
    <div className="auth-screen">
      <h1>The Pool Hub</h1>
      <p>Logged in as {session?.user.email}</p>
      <button type="button" onClick={() => signOut()}>
        Log Out
      </button>
    </div>
  );
}
