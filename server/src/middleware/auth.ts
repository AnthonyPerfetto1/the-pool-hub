import type { NextFunction, Request, Response } from "express";
import { getSupabaseClient } from "../auth/supabase-client";
import { HttpError } from "./error-handler";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req.header("authorization"));

  if (!token) {
    next(new HttpError(401, "UNAUTHORIZED", "Missing bearer token."));
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      next(new HttpError(401, "UNAUTHORIZED", "Invalid or expired session."));
      return;
    }

    req.userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
}

export function getAuthenticatedUserId(req: Request): string {
  if (!req.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing bearer token.");
  }
  return req.userId;
}
