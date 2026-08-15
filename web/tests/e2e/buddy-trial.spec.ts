import { expect, test } from "@playwright/test";
import { invalidTextFile, syntheticPng } from "./synthetic-images";

const activeInvite = "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0";
const expiredInvite = "btv1_2a6d4f8c1b3e5a7099e8d7c6b5a43210";
const usedInvite = "btv1_7c9a1e5d3f8b2460a4c2e1d9b8f60531";
const activeInviteStorageKey = `gfm:buddy-trial:v1:${activeInvite}`;
const activeInvitePointerKey = "gfm:buddy-trial:v1:active-invite";

test.describe("Buddy Trial invite route", () => {
  test("server-renders an active invite without an indefinite private-link loading shell", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/trial/${activeInvite}`);

    await expect(page.getByRole("heading", { name: /Build yourself in College Football 27/i })).toBeVisible();
    await expect(page.getByText("Loading your private link")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue guided scan" })).toBeVisible();

    await context.close();
  });

  test("enters an active fixture invite, records consent, and resumes without an account", async ({ page }) => {
    await installSyntheticCamera(page);
    await page.goto(`/trial/${activeInvite}`);

    await expect(page.getByRole("heading", { name: /Build yourself in College Football 27/i })).toBeVisible();
    await expect(page.getByText("GameFace Match Private Beta")).toBeVisible();
    await expect(page.locator(".buddy-trial-copy", { hasText: "Open the guided scan when you are ready." })).toBeVisible();
    await expect(page.getByText("Scan in progress")).toHaveCount(0);
    await expect(page.getByText("What you'll do")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete My Trial Data" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before we scan" })).toHaveCount(0);
    if (process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO === "true") {
      await expect(page.getByText("Owner Review Demo — appearance settings are test data.")).toBeVisible();
    } else {
      await expect(page.getByText(/Purchase verification is not connected yet|Real College Football 27 settings are not available yet/i)).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: /verifier/i })).toHaveCount(0);

    const continueButton = page.getByRole("button", { name: "Continue guided scan" });
    await expect(continueButton).toBeDisabled();
    await expect(page.getByLabel(/I confirm I meet the age requirement/i)).not.toBeChecked();
    await page.getByLabel(/I confirm I meet the age requirement/i).check();
    await expect(continueButton).toBeEnabled();
    await expect(page.getByText(/free invite uses experimental research settings/i)).toBeVisible();
    await continueButton.click();

    await expect(page).toHaveURL(new RegExp(`/\\?buddyTrialInvite=${activeInvite}#start$`));
    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeEnabled();
    await expect(page.getByText(/Purchase verification is not connected yet|production scans stay blocked|Verified catalog data is not loaded/i)).toHaveCount(0);
    await expect(page.getByText("Development catalog state")).toHaveCount(0);
    await expect(page.getByText(/RGB|TrueDepth|ARKit|3D reconstruction|production catalog|development catalog/i)).toHaveCount(0);

    await page.goto("/#start");
    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeEnabled();
    await expect(page.getByText(/Purchase verification is not connected yet|production scans stay blocked|Verified catalog data is not loaded/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page.getByRole("heading", { name: "Get Ready" })).toBeVisible();
    await expect(page.getByText("Remove glasses or headwear")).toBeVisible();
    await expect(page.getByText("Hold the phone at eye level")).toBeVisible();
    await expect(page.getByText(/RGB|TrueDepth|ARKit|3D reconstruction|Development catalog state/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Start Camera" }).click();
    await expect(page.getByRole("button", { name: "Start Camera", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Begin Scan", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Guided face scan camera preview")).toBeVisible();
    await expect(page.getByText(/Mobile scan readiness|iPhone scan readiness/i)).toHaveCount(0);
    await expect(page.getByText("Development catalog state")).toHaveCount(0);
    await expect(page.getByText(/RGB|TrueDepth|ARKit|3D reconstruction|production catalog|development catalog/i)).toHaveCount(0);
    const streamIsActive = await page.getByLabel("Guided face scan camera preview").evaluate((node) => {
      const video = node as HTMLVideoElement;
      return video.srcObject instanceof MediaStream && video.srcObject.getVideoTracks().some((track) => track.readyState === "live");
    });
    expect(streamIsActive).toBe(true);

    await page.goto(`/trial/${activeInvite}`);
    await page.reload();
    await expect(page.getByText("Ready to scan").first()).toBeVisible();
    await expect(page.getByText(/same private link/i)).toBeVisible();
  });

  test("keeps direct beta scan URLs payment-free but consent-gated", async ({ page }) => {
    await page.goto(`/?buddyTrialInvite=${activeInvite}#start`);

    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeDisabled();
    await expect(page.getByText(/Return to your private beta invite link/i)).toBeVisible();
    await expect(page.getByText(/Purchase verification is not connected yet|production scans stay blocked|Verified catalog data is not loaded/i)).toHaveCount(0);

    await page.goto("/?buddyTrialInvite=not-a-real-invite#start");
    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeDisabled();
    await expect(page.getByText("Private beta access active.")).toHaveCount(0);
    await expect(page.getByText(/Return to your private beta invite link/i)).toHaveCount(0);
  });

  test("recovers beta scan access from the active invite pointer when the setup URL loses its query", async ({ page }) => {
    await page.addInitScript(
      ({ key, inviteId }) => {
        const now = "2026-08-14T12:00:00.000Z";
        const session = {
          schemaVersion: "buddy-trial-v1",
          sessionId: "bt_session_pointer_recovery",
          inviteId,
          state: "SCAN_IN_PROGRESS",
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          deletedAt: null,
          consent: {
            consentVersion: "2026-07-01",
            acceptedAt: now,
            acknowledgments: {
              ageEligibility: true,
              subjectPermission: true,
              cameraUse: true,
              currentFaceAnalysis: true,
              temporaryProcessing: true
            }
          },
          catalogGate: "beta_research_available",
          buildGuide: null,
          refinementGuide: null,
          videoOneReview: null,
          videoTwoReview: null,
          finalOutcome: null,
          resultPhotoFeedback: null,
          learningRecord: null,
          history: [{ state: "SCAN_IN_PROGRESS", at: now, note: "Test beta scan started." }]
        };
        window.localStorage.setItem(`gfm:buddy-trial:v1:${inviteId}`, JSON.stringify(session));
        window.sessionStorage.setItem(key, inviteId);
      },
      { key: activeInvitePointerKey, inviteId: activeInvite }
    );
    await page.goto("/#start");

    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeEnabled();
    await expect(page.getByText(/Purchase verification is not connected yet|production scans stay blocked|Verified catalog data is not loaded/i)).toHaveCount(0);
  });

  test("shows invalid, expired, and completed invite states", async ({ page }) => {
    await page.goto("/trial/not-a-real-invite");
    await expect(page.getByRole("heading", { name: "This private link is not valid" })).toBeVisible();
    await expect(page.getByText("Loading your private link")).toHaveCount(0);

    await page.goto(`/trial/${expiredInvite}`);
    await expect(page.getByRole("heading", { name: "This private link expired" })).toBeVisible();
    await expect(page.getByText("Loading your private link")).toHaveCount(0);

    await page.goto(`/trial/${usedInvite}`);
    await expect(page.getByRole("heading", { name: "This private link is complete" })).toBeVisible();
    await expect(page.getByText("Loading your private link")).toHaveCount(0);
  });

  test("fails closed with an actionable error when local trial storage is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("Local storage is disabled for this test.", "SecurityError");
        }
      });
    });

    await page.goto(`/trial/${activeInvite}`);

    await expect(page.getByRole("heading", { name: "Private trial storage is blocked" })).toBeVisible();
    await expect(page.getByText(/Turn on browser storage for this site/i)).toBeVisible();
    await expect(page.getByText("Loading your private link")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
  });

  test("keeps deleted local trial state through refresh", async ({ page }) => {
    await page.goto(`/trial/${activeInvite}`);
    await page.getByText("Privacy details").click();
    await page.getByRole("button", { name: "Delete My Trial Data" }).click();
    await expect(page.getByRole("heading", { name: "Trial data removed" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Trial data removed" })).toBeVisible();
  });

  test("completes the owner-review demo scan-to-build journey at required mobile widths", async ({ page }) => {
    test.skip(process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO !== "true", "Owner Review Demo E2E requires NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true.");
    await installSyntheticCamera(page);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 438, height: 841 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/trial/${activeInvite}`);
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();

      await expect(page.getByRole("heading", { name: /Build yourself in College Football 27/i })).toBeVisible();
      await expect(page.getByText("Owner Review Demo — appearance settings are test data.")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Before we scan" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Continue guided scan" })).toBeDisabled();
      await page.getByLabel(/I confirm I meet the age requirement/i).check();
      await page.getByRole("button", { name: "Continue guided scan" }).click();

      await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
      await page.getByRole("button", { name: "Get Started" }).click();
      await expect(page.getByRole("heading", { name: "Get Ready" })).toBeVisible();
      await page.getByRole("button", { name: "Start Camera" }).click();
      await expect(page.getByRole("button", { name: "Start Camera", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Begin Scan", exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Guided face scan camera preview")).toBeVisible();
      await expect(page.getByText("Rotate the phone to portrait before starting the guided scan.")).toHaveCount(0);
      await expect(page.getByText("Development catalog state")).toHaveCount(0);
      await expect(page.getByText(/RGB|TrueDepth|ARKit|3D reconstruction|production catalog|development catalog/i)).toHaveCount(0);

      await page.evaluate(
        ({ key }) => {
          const session = JSON.parse(window.localStorage.getItem(key) ?? "{}");
          const timestamp = "2026-08-07T12:10:00.000Z";
          session.state = "SCAN_COMPLETE";
          session.updatedAt = timestamp;
          session.catalogGate = "owner_review_demo_available";
          session.history = [
            ...(Array.isArray(session.history) ? session.history : []),
            { state: "SCAN_COMPLETE", at: timestamp, note: "E2E deterministic guided scan completion checkpoint; no raw media stored." }
          ];
          window.localStorage.setItem(key, JSON.stringify(session));
        },
        { key: activeInviteStorageKey }
      );
      await page.goto(`/trial/${activeInvite}`);

      await expect(page.getByRole("heading", { name: "Building your GameFace..." })).toBeVisible();
      await page.getByRole("button", { name: "View my GameFace recommendation" }).click();

      await expect(page.getByRole("heading", { name: "Your GameFace recommendation" })).toBeVisible();
      await expect(page.getByText("Best Match")).toBeVisible();
      await expect(page.getByText(/Match Score \d+\/100/i)).toBeVisible();
      await expect(page.getByText("Skin details")).toBeVisible();
      await expect(page.getByText("Nose bridge", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Build This in College Football 27" }).click();

      await expect(page.getByRole("heading", { name: "Build This in College Football 27" })).toBeVisible();
      await expect(page.getByText("Step 1 of 11")).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByText("Step 2 of 11")).toBeVisible();
      await page.getByRole("button", { name: "View All Settings" }).click();
      await expect(page.getByLabel("All build settings")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("All build settings")).toBeVisible();
      await page.getByRole("button", { name: "Show Current Step" }).click();

      for (let index = 2; index <= 11; index += 1) {
        await expect(page.getByText(`Step ${index} of 11`)).toBeVisible();
        await page.getByRole("button", { name: /^(Done|Next)$/ }).click();
      }

        await expect(page.getByRole("heading", { name: "I built it in College Football 27" })).toBeVisible();
        await expect(page.getByText("Front image required")).toBeVisible();
        await expect(page.getByRole("button", { name: "Submit feedback" })).toBeDisabled();

        await page.locator('input[type="file"]').first().setInputFiles(invalidTextFile());
        await expect(page.getByText("Use a JPEG, PNG, or WebP image.")).toBeVisible();
        await page.locator('input[type="file"]').first().setInputFiles(syntheticPng("cf27-front.png", 900, 1100, 3));
        await expect(page.getByText("Front image ready")).toBeVisible();
        await expect(page.getByText(/private beta storage path ready/i)).toBeVisible();

        await page.getByLabel("How much does this look like you?").selectOption("4");
        await page.getByRole("group", { name: "Was one of the other top-three options better?" }).getByRole("radio", { name: "No", exact: true }).check();
        await page.getByLabel("What looks most wrong?").fill("Jaw is still a little wide.");
        await page.getByRole("group", { name: "Did you change any recommended setting manually?" }).getByRole("radio", { name: "No", exact: true }).check();
        await page.getByLabel(/Use my rating, settings, player photos/i).check();
        await page.reload();
        await expect(page.getByRole("heading", { name: "I built it in College Football 27" })).toBeVisible();
        await expect(page.getByLabel("How much does this look like you?")).toHaveValue("4");
        await expect(page.getByText("Front image ready")).toBeVisible();
        await page.getByRole("button", { name: "Submit feedback" }).click();
        await expect(page.getByRole("heading", { name: "GameFace feedback sent." })).toBeVisible();
        await expect(page.getByText("Resemblance rating: 4 / 5")).toBeVisible();
        await expect(page.getByText("These photos and ratings are private beta research signals.")).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});

async function installSyntheticCamera(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const grantedStatus = { state: "granted", onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false };
    Object.defineProperty(navigator, "permissions", {
      value: { query: () => Promise.resolve(grantedStatus) },
      configurable: true
    });
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: () => Promise.resolve([{ kind: "videoinput", label: "Front camera", deviceId: "synthetic-front", groupId: "synthetic" }]),
        getUserMedia: () => {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext("2d");
          if (context) {
            context.fillStyle = "#111";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "#d9b18f";
            context.beginPath();
            context.ellipse(320, 220, 110, 145, 0, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = "#222";
            context.beginPath();
            context.arc(280, 200, 10, 0, Math.PI * 2);
            context.arc(360, 200, 10, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = "#222";
            context.lineWidth = 6;
            context.beginPath();
            context.arc(320, 255, 44, 0.15 * Math.PI, 0.85 * Math.PI);
            context.stroke();
          }
          return Promise.resolve(canvas.captureStream(10));
        }
      },
      configurable: true
    });
  });
}
