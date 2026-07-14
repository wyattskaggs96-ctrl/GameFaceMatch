import type { Metadata } from "next";
import { LaunchMarketingPage } from "@/features/marketing/LaunchMarketingPage";

export const metadata: Metadata = {
  title: "GameFace Match | Build yourself in College Football 27",
  description:
    "Independent companion app for getting your closest available College Football 27 in-game appearance and a manual build guide from verified catalog data."
};

export default function LaunchPage() {
  return <LaunchMarketingPage />;
}
