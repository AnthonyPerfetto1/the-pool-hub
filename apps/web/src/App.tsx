import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";

function RootView() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="auth-screen">Loading…</div>;
  }

  return session ? <HomeScreen /> : <LoginScreen />;
}

function App() {
  return (
    <AuthProvider>
      <RootView />
    </AuthProvider>
  );
}

export default App;
