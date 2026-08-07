import type { Metadata } from "next";
import { BuddyTrialEntry } from "@/features/buddy-trial/BuddyTrialEntry";

export const metadata: Metadata = {
  title: "Private Buddy Trial | GameFace Match",
  description: "Invite-only GameFace Match buddy trial entry.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function BuddyTrialInvitePage({ params }: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await params;
  return <BuddyTrialEntry inviteId={inviteId} />;
}
