import { apiClient } from "../lib/api-client";

// The backend's GET /api/v1/profile has no shared-types entry yet (it
// predates the shared Customer/Order/Transaction contracts), so the response
// shape is defined locally here rather than expanding packages/types for a
// read-only greeting.
export interface Profile {
  id: string;
  name: string;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  profile: Profile;
}

export function getProfile(): Promise<ProfileResponse> {
  return apiClient.get<ProfileResponse>("/profile");
}
