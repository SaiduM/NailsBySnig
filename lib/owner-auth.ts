const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const CLOUDFLARE_EMAIL_HEADER = "cf-access-authenticated-user-email";
import { ownerSessionFromRequest, verifyOwnerSession } from "./owner-session";

export async function ownerAccess(request: Request) {
  const configuredEmail = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!configuredEmail) {
    return { allowed: false, status: 503, error: "Owner access has not been configured yet." };
  }
  const signedInEmail = (
    request.headers.get(USER_EMAIL_HEADER) ??
    request.headers.get(CLOUDFLARE_EMAIL_HEADER) ??
    ""
  ).trim().toLowerCase();
  if (!signedInEmail && await verifyOwnerSession(ownerSessionFromRequest(request))) {
    return { allowed: true, status: 200, email: configuredEmail };
  }
  if (!signedInEmail) {
    return { allowed: false, status: 401, error: "Please sign in to access the owner dashboard." };
  }
  if (signedInEmail !== configuredEmail) {
    return { allowed: false, status: 403, error: "This account does not have owner access." };
  }
  return { allowed: true, status: 200, email: signedInEmail };
}
