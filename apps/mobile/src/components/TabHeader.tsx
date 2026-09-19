import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The tab bar screens draw their own header instead of relying on the
// navigator's built-in one — React Navigation's per-tab headers were
// rendering overlapped with each other (a react-native-screens quirk with
// this app's setup), so headerShown is off for the whole tab navigator and
// each screen renders this instead. Root-stack screens (Order Detail,
// Customer Detail, forms, etc.) are unaffected and keep their normal headers.
export function TabHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
});
