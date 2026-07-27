import type { Metadata } from "next";
import { BookingExperience } from "./BookingExperience";

export const metadata: Metadata = {
  title: "NailsBySnig | Thoughtful nails, simply booked",
  description:
    "Book detailed gel manicures, Gel-X sets, and custom nail art with NailsBySnig.",
};

export default function Home() {
  return <BookingExperience />;
}
