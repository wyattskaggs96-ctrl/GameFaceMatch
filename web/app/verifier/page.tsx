import { notFound } from "next/navigation";
import { SupportedSubsetVerifierWorkflow } from "@/features/verifier/SupportedSubsetVerifierWorkflow";

export default function VerifierPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SupportedSubsetVerifierWorkflow />;
}
