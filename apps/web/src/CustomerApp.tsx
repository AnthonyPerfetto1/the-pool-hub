import { useState } from "react";
import { CustomerDetailScreen } from "./screens/CustomerDetailScreen";
import { CustomerFormScreen } from "./screens/CustomerFormScreen";
import { CustomerListScreen } from "./screens/CustomerListScreen";

type View =
  | { screen: "list" }
  | { screen: "detail"; customerId: string }
  | { screen: "form"; mode: "create" }
  | { screen: "form"; mode: "edit"; customerId: string };

export function CustomerApp() {
  const [view, setView] = useState<View>({ screen: "list" });

  if (view.screen === "detail") {
    return (
      <CustomerDetailScreen
        customerId={view.customerId}
        onBack={() => setView({ screen: "list" })}
        onEdit={(customerId) => setView({ screen: "form", mode: "edit", customerId })}
      />
    );
  }

  if (view.screen === "form") {
    return (
      <CustomerFormScreen
        target={view}
        onDone={() => setView({ screen: "list" })}
        onCancel={() => setView({ screen: "list" })}
      />
    );
  }

  return (
    <CustomerListScreen
      onSelectCustomer={(customerId) => setView({ screen: "detail", customerId })}
      onAddCustomer={() => setView({ screen: "form", mode: "create" })}
    />
  );
}
