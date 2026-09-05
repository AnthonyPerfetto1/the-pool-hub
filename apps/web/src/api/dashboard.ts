import type { Dashboard } from "@the-pool-hub/types";
import { apiClient } from "../lib/api-client";

interface DashboardResponse {
  dashboard: Dashboard;
}

export function getDashboard(): Promise<DashboardResponse> {
  return apiClient.get<DashboardResponse>("/dashboard");
}
