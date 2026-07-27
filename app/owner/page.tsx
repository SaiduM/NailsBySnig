import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getChatGPTUser } from "../chatgpt-auth";
import { OWNER_SESSION_COOKIE, verifyOwnerSession } from "../../lib/owner-session";
import { OwnerDashboard } from "./OwnerDashboard";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const user = await getChatGPTUser();
  const ownerEmail = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const session = (await cookies()).get(OWNER_SESSION_COOKIE)?.value ?? "";
  const passwordSessionValid = await verifyOwnerSession(session);
  if (!user && !passwordSessionValid) redirect("/owner/login");
  if (!ownerEmail || (user && user.email.toLowerCase() !== ownerEmail)) {
    return (
      <main className="manage-appointment">
        <section className="manage-card">
          <h1>Owner access isn&apos;t available.</h1>
          <p>{ownerEmail ? "This signed-in account is not the configured owner." : "Add the owner email securely before using this dashboard."}</p>
          <Link className="manage-home" href="/">Back to NailsBySnig</Link>
        </section>
      </main>
    );
  }
  return <OwnerDashboard ownerName={user?.displayName ?? ownerEmail} />;
}
