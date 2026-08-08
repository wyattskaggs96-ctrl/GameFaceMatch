import { notFound } from "next/navigation";
import { SupportedSubsetVerifierWorkflow } from "@/features/verifier/SupportedSubsetVerifierWorkflow";
import { isInternalToolingAvailableInRuntime } from "@/lib/security/owner-review-access";

export default function VerifierPage() {
  if (!isInternalToolingAvailableInRuntime(process.env)) notFound();
  return <SupportedSubsetVerifierWorkflow />;
}
