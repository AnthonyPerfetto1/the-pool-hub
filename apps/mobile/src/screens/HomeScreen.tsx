import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../auth/AuthContext";

export function HomeScreen() {
  const { session, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>The Pool Hub</Text>
      <Text style={styles.subtitle}>Logged in as {session?.user.email}</Text>

      <TouchableOpacity style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#c0392b",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
