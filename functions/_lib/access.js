import { cleanString, getActor, HttpError } from "./http.js";

const OWNER_ROLES = new Set(["owner"]);
const STAFF_ROLE_ALIASES = new Set(["staff", "doctor", "nurse", "pharmacist", "front_desk", "billing", "support"]);
const BEARER_PREFIX = "Bearer ";

export function canUseRole(actorRole, allowedRoles) {
  if (allowedRoles.includes(actorRole)) {
    return true;
  }

  return allowedRoles.some((role) => STAFF_ROLE_ALIASES.has(role)) && actorRole === "staff";
}

export async function requireBranchAccess(context, db, branchId, allowedRoles) {
  const actor = await resolveActor(context, db);
  const normalizedBranchId = cleanString(branchId, 128);

  if (!normalizedBranchId) {
    throw new HttpError(400, "VALIDATION_ERROR", "branchId is required.");
  }

  if (OWNER_ROLES.has(actor.role) && allowedRoles.includes("owner")) {
    return actor;
  }

  if (!canUseRole(actor.role, allowedRoles)) {
    const status = actor.role === "anonymous" ? 401 : 403;
    const code = actor.role === "anonymous" ? "AUTH_REQUIRED" : "FORBIDDEN";
    throw new HttpError(status, code, "This endpoint requires an authorized UsrahMedic role.");
  }

  if (!actor.id) {
    throw new HttpError(401, "AUTH_REQUIRED", "A staff identity is required for branch-scoped access.");
  }

  if (actor.sessionBranchId && actor.sessionBranchId !== normalizedBranchId && actor.role !== "admin") {
    throw new HttpError(403, "BRANCH_SESSION_MISMATCH", "Authenticated session is not valid for this branch.");
  }

  const assignment = await db.prepare(
    `SELECT
      s.id,
      s.role,
      a.role_at_branch
    FROM staff_accounts s
    JOIN staff_branch_assignments a ON a.staff_account_id = s.id
    WHERE s.id = ?
      AND s.status = 'active'
      AND a.branch_id = ?
      AND a.status = 'active'
      AND (a.ends_at IS NULL OR a.ends_at >= CURRENT_TIMESTAMP)
    LIMIT 1`
  ).bind(actor.id, normalizedBranchId).first();

  if (!assignment && actor.role !== "admin") {
    throw new HttpError(403, "BRANCH_ACCESS_DENIED", "Staff account is not assigned to this branch.");
  }

  if (assignment && !canUseRole(assignment.role_at_branch, allowedRoles) && !canUseRole(assignment.role, allowedRoles)) {
    throw new HttpError(403, "BRANCH_ROLE_DENIED", "Staff account role is not allowed for this branch workflow.");
  }

  return {
    ...actor,
    staffAccountId: assignment ? assignment.id : actor.id,
    branchRole: assignment ? assignment.role_at_branch : actor.role
  };
}

export async function resolveActor(context, db) {
  const sessionToken = extractSessionToken(context.request.headers);
  if (!sessionToken) {
    return getActor(context);
  }

  const pepper = context.env.AUDIT_HASH_PEPPER || "";
  const sessionTokenHash = await hashSessionToken(sessionToken, pepper);
  const session = await db.prepare(
    `SELECT
      ss.id AS session_id,
      ss.staff_account_id,
      ss.branch_id AS session_branch_id,
      s.role,
      s.status,
      s.mfa_required,
      ss.mfa_verified_at
    FROM staff_sessions ss
    JOIN staff_accounts s ON s.id = ss.staff_account_id
    WHERE ss.session_token_hash = ?
      AND ss.revoked_at IS NULL
      AND ss.expires_at >= CURRENT_TIMESTAMP
      AND s.status = 'active'
      AND (s.mfa_required = 0 OR ss.mfa_verified_at IS NOT NULL)
    LIMIT 1`
  ).bind(sessionTokenHash).first();

  if (!session) {
    throw new HttpError(401, "SESSION_INVALID", "Session token is invalid, expired, or revoked.");
  }

  return {
    role: cleanString(session.role, 32)?.toLowerCase() || "staff",
    id: cleanString(session.staff_account_id, 128),
    sessionId: cleanString(session.session_id, 128),
    sessionBranchId: cleanString(session.session_branch_id, 128),
    authenticatedVia: "session"
  };
}

export function appendBranchFilter(url, fieldName = "branchId") {
  return cleanString(url.searchParams.get(fieldName), 128);
}

function extractSessionToken(headers) {
  const directToken = cleanString(headers.get("X-UsrahMedic-Session-Token"), 500);
  if (directToken) {
    return directToken;
  }

  const authorization = cleanString(headers.get("Authorization"), 600);
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
    return null;
  }

  return cleanString(authorization.slice(BEARER_PREFIX.length), 500);
}

async function hashSessionToken(value, pepper = "") {
  const normalized = cleanString(value, 500);
  if (!normalized) {
    return null;
  }

  const data = new TextEncoder().encode(`${pepper}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
