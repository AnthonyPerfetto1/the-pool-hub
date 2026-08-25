import { useState } from "react";
import { CustomerDetailScreen } from "./screens/CustomerDetailScreen";
import { CustomerFormScreen } from "./screens/CustomerFormScreen";
import { CustomerListScreen } from "./screens/CustomerListScreen";
import { OrderDetailScreen } from "./screens/OrderDetailScreen";
import { OrderFormScreen, type OrderFormTarget } from "./screens/OrderFormScreen";
import { OrderListScreen } from "./screens/OrderListScreen";

type OrderReturnTarget = { screen: "orders" } | { screen: "detail"; customerId: string };

type View =
  | { screen: "list" }
  | { screen: "detail"; customerId: string }
  | { screen: "form"; mode: "create" }
  | { screen: "form"; mode: "edit"; customerId: string }
  | { screen: "orders" }
  | { screen: "orderDetail"; orderId: string; returnTo: OrderReturnTarget }
  | { screen: "orderForm"; target: OrderFormTarget; returnTo: OrderReturnTarget };

export function CustomerApp() {
  const [view, setView] = useState<View>({ screen: "list" });

  if (view.screen === "detail") {
    return (
      <CustomerDetailScreen
        customerId={view.customerId}
        onBack={() => setView({ screen: "list" })}
        onEdit={(customerId) => setView({ screen: "form", mode: "edit", customerId })}
        onSelectOrder={(orderId) =>
          setView({
            screen: "orderDetail",
            orderId,
            returnTo: { screen: "detail", customerId: view.customerId },
          })
        }
        onNewOrder={(customerId) =>
          setView({
            screen: "orderForm",
            target: { mode: "create", customerId },
            returnTo: { screen: "detail", customerId },
          })
        }
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

  if (view.screen === "orders") {
    return (
      <OrderListScreen
        onBack={() => setView({ screen: "list" })}
        onSelectOrder={(orderId) =>
          setView({ screen: "orderDetail", orderId, returnTo: { screen: "orders" } })
        }
      />
    );
  }

  if (view.screen === "orderDetail") {
    const { returnTo } = view;
    return (
      <OrderDetailScreen
        orderId={view.orderId}
        onBack={() => setView(returnTo)}
        onEdit={(orderId) =>
          setView({ screen: "orderForm", target: { mode: "edit", orderId }, returnTo })
        }
      />
    );
  }

  if (view.screen === "orderForm") {
    const { returnTo } = view;
    return (
      <OrderFormScreen
        target={view.target}
        onDone={() => setView(returnTo)}
        onCancel={() => setView(returnTo)}
      />
    );
  }

  return (
    <CustomerListScreen
      onSelectCustomer={(customerId) => setView({ screen: "detail", customerId })}
      onAddCustomer={() => setView({ screen: "form", mode: "create" })}
      onViewOrders={() => setView({ screen: "orders" })}
    />
  );
}
