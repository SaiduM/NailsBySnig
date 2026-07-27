import { CancelAppointment } from "./CancelAppointment";

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <CancelAppointment token={token} />;
}
