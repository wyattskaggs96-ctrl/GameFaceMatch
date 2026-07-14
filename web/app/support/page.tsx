import type { Metadata } from "next";
import { SupportPage } from "@/features/marketing/SupportPage";

export const metadata: Metadata = {
  title: "GameFace Match Support",
  description: "Support, privacy, refund-readiness, and catalog-status guidance for GameFace Match."
};

export default function SupportRoute() {
  return <SupportPage />;
}
