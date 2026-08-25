import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { profiles } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error-handler";

export const profileRouter = Router();

export type Profile = typeof profiles.$inferSelect;

export function toProfileResponse(profile: Profile) {
  return {
    id: profile.id,
    name: profile.name,
    companyName: profile.companyName,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

interface ProfileUpdate {
  name?: string;
  companyName?: string | null;
}

function parseProfileUpdate(body: unknown): ProfileUpdate {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const { name, companyName } = body as Record<string, unknown>;
  const updates: ProfileUpdate = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "name must be a non-empty string.");
    }
    updates.name = name;
  }

  if (companyName !== undefined) {
    if (companyName !== null && typeof companyName !== "string") {
      throw new HttpError(400, "VALIDATION_ERROR", "companyName must be a string or null.");
    }
    updates.companyName = companyName;
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "At least one of name or companyName must be provided.",
    );
  }

  return updates;
}

profileRouter.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!profile) {
      next(new HttpError(404, "PROFILE_NOT_FOUND", "No profile exists for this account."));
      return;
    }

    res.json({ profile: toProfileResponse(profile) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const updates = parseProfileUpdate(req.body);

    const [updated] = await db
      .update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning();

    if (!updated) {
      next(new HttpError(404, "PROFILE_NOT_FOUND", "No profile exists for this account."));
      return;
    }

    res.json({ profile: toProfileResponse(updated) });
  } catch (error) {
    next(error);
  }
});
