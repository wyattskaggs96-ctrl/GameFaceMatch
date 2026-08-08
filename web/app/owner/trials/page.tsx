import { notFound } from "next/navigation";
import { OwnerTrialCommandCenter } from "@/features/buddy-trial/OwnerTrialCommandCenter";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

export default function OwnerTrialsPage() {
  if (!isInternalToolingAvailableInRuntime(process.env)) notFound();
  return <OwnerTrialCommandCenter />;
}
