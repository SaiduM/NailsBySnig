import { redirect } from "next/navigation";
import Link from "next/link";
import { getChatGPTUser } from "../chatgpt-auth";
import { OwnerDashboard } from "./OwnerDashboard";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const user = await getChatGPTUser();
  if (!user) redirect("/signin-with-chatgpt?return_to=%2Fowner");
  const ownerEmail = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!ownerEmail || user.email.toLowerCase() !== ownerEmail) {
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
  return <OwnerDashboard ownerName={user.displayName} />;
}
