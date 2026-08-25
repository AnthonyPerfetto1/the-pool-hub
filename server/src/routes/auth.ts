import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { profiles } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { toProfileResponse, type Profile } from "./profile";

export const authRouter = Router();

interface AuthMeResponse {
  user: { id: string };
  profile: ReturnType<typeof toProfileResponse> | null;
}

authRouter.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const [profile]: Profile[] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const response: AuthMeResponse = {
      user: { id: userId },
      profile: profile ? toProfileResponse(profile) : null,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});
