import { notFound } from "next/navigation";
import { OwnerTrialCommandCenter } from "@/features/buddy-trial/OwnerTrialCommandCenter";

export default function OwnerTrialsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OwnerTrialCommandCenter />;
}
