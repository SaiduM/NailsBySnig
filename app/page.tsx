import type { Metadata } from "next";
import { BookingExperience } from "./BookingExperience";

export const metadata: Metadata = {
  title: "Nail by Snig | Thoughtful nails, simply booked",
  description:
    "Book detailed gel manicures, Gel-X sets, and custom nail art with Nail by Snig.",
};

export default function Home() {
  return <BookingExperience />;
}
