import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { CustomerApp } from "./CustomerApp";
import { LoginScreen } from "./screens/LoginScreen";

function RootView() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="auth-screen">Loading…</div>;
  }

  return session ? <CustomerApp /> : <LoginScreen />;
}

function App() {
  return (
    <AuthProvider>
      <RootView />
    </AuthProvider>
  );
}

export default App;
