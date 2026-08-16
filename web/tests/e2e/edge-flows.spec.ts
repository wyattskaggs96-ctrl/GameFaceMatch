import { expect, test } from "@playwright/test";
import { acceptRequiredConsent, completeOnboarding, consentCard, navigateToCapture, uploadFallbackForAngle } from "./helpers";
import { invalidTextFile, syntheticPng } from "./synthetic-images";

test.describe("GameFace Match E2E edge flows", () => {
  test("renders the Face ID style welcome screen at the target iPhone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/#welcome");

    await expect(page.getByRole("heading", { name: "Quick Scan to put you in the game" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How your quick scan works" })).toBeVisible();
    await expect(page.getByText("Build your Road to Glory look with confidence.")).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Get Started" })).toBeVisible();

    const renderedState = await page.locator(".face-id-welcome-screen").evaluate((element) => {
      const style = window.getComputedStyle(element);
      const title = element.querySelector(".face-id-welcome-title");
      return {
        background: style.backgroundColor,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        titleFits: title ? title.scrollWidth <= title.clientWidth : false,
        hasRing: Boolean(element.querySelector(".face-id-dotted-ring")),
        hasFaceIcon: Boolean(element.querySelector(".face-id-smile-icon")),
        hasFakeStatusChrome: Boolean(
          element.querySelector(
            ".face-id-status-bar, .face-id-status-time, .face-id-status-icons, .face-id-cellular, .face-id-wifi, .face-id-battery, .face-id-home-indicator"
          )
        )
      };
    });

    expect(renderedState).toEqual({
      background: "rgb(255, 255, 255)",
      viewport: { width: 430, height: 932 },
      titleFits: true,
      hasRing: true,
      hasFaceIcon: true,
      hasFakeStatusChrome: false
    });

    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/#preparation$/);
    await expect(page.getByRole("heading", { name: "How to Set Up Face ID" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toBeVisible();
  });

  test("renders the post-scan game selection screen at mobile viewports", async ({ page }) => {
    for (const viewport of [
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/#game-selection");

      await expect(page.locator(".post-scan-complete-card h1 span", { hasText: "First Face ID" })).toBeVisible();
      await expect(page.locator(".post-scan-complete-card h1 span", { hasText: "scan complete." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "See you in game players" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Select College Football 27" })).toBeVisible();
      await expect(page.getByText("Madden NFL 26")).toBeVisible();
      await expect(page.getByText("NBA 2K26")).toBeVisible();
      await expect(page.getByText("EA Sports PGA Tour")).toBeVisible();
      await expect(page.getByText("PBA Pro Bowling 2026")).toBeVisible();
      await expect(page.getByText("More Games Soon")).toBeVisible();
      await expect(page.locator(".post-scan-game-grid")).toHaveCSS("grid-template-columns", /.+ .+/);
      await expect(page.locator(".topbar")).toHaveCount(0);
      await expect(page.locator(".mobile-nav")).toHaveCount(0);
      await expect(page.getByText("Build your Road to Glory look with confidence.")).toHaveCount(0);
      const metrics = await page.locator(".post-scan-game-screen").evaluate((element) => ({
        background: window.getComputedStyle(element).backgroundColor,
        scrollable: element.scrollHeight > element.clientHeight,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }));
      expect(metrics, `${viewport.width}x${viewport.height}`).toEqual({
        background: "rgb(0, 0, 0)",
        scrollable: true,
        horizontalOverflow: false
      });
    }
  });

  test("routes completed visual scan state to post-scan game selection", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO !== "true" && process.env.NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS !== "1",
      "Requires setup visual-state test hooks."
    );
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/?setupVisualState=complete#capture");

    await expect(page.locator(".setup-capture-copy h1 span", { hasText: "First Face ID" })).toBeVisible();
    await expect(page.locator(".setup-capture-copy h1 span", { hasText: "scan complete." })).toBeVisible();
    await page.getByRole("button", { name: "Continue after completed scan" }).click();
    await expect(page).toHaveURL(/#game-selection$/);
    await expect(page.getByRole("heading", { name: "See you in game players" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select College Football 27" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to Set Up Face ID" })).toHaveCount(0);
  });

  test("opens every post-scan game tile and returns to the reusable game grid", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO !== "true" && process.env.NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS !== "1",
      "Requires setup visual-state test hooks."
    );
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/?setupVisualState=complete#capture");
    await page.getByRole("button", { name: "Continue after completed scan" }).click();
    await expect(page).toHaveURL(/#game-selection$/);

    const games = [
      { button: "Select College Football 27", heading: "College Football 27", url: /#game\/college-football-27$/ },
      { button: "Select Madden NFL 26", heading: "Madden NFL 26", url: /#game\/madden-nfl-26$/ },
      { button: "Select NBA 2K26", heading: "NBA 2K26", url: /#game\/nba-2k26$/ },
      { button: "Select EA Sports PGA Tour", heading: "EA Sports PGA Tour", url: /#game\/ea-sports-pga-tour$/ },
      { button: "Select PBA Pro Bowling 2026", heading: "PBA Pro Bowling 2026", url: /#game\/pba-pro-bowling-2026$/ }
    ];

    for (const game of games) {
      await page.getByRole("button", { name: game.button }).click();
      await expect(page).toHaveURL(game.url);
      await expect(page.getByRole("heading", { name: game.heading })).toBeVisible();
      await expect(page.getByText("Your scan is ready.")).toBeVisible();
      await expect(page.getByLabel("Reusable scan profile status")).toBeVisible();
      await expect(page.getByText(/before recommendations go live|not available for customer recommendations/i)).toBeVisible();
      await expect(page.getByText(/fail-closed behavior/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toHaveCount(0);
      await page.getByRole("button", { name: "Back to games" }).click();
      await expect(page).toHaveURL(/#game-selection$/);
      await expect(page.getByRole("heading", { name: "See you in game players" })).toBeVisible();
    }

    await page.getByRole("button", { name: "More games coming soon" }).click();
    await expect(page).toHaveURL(/#more-games-soon$/);
    await expect(page.getByRole("heading", { name: "More games coming soon." })).toBeVisible();
    await page.getByRole("button", { name: "Back to games" }).click();
    await expect(page).toHaveURL(/#game-selection$/);
  });

  test("game routes fail safely without a completed reusable scan profile", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/#game/nba-2k26");

    await expect(page.getByRole("heading", { name: "NBA 2K26" })).toBeVisible();
    await expect(page.getByText("Scan needed")).toBeVisible();
    await expect(page.getByText("Complete one scan before choosing a game.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start scan" })).toBeVisible();
    await expect(page.getByText(/fake|fixture|synthetic/i)).toHaveCount(0);
  });

  test("blocks progress when required consent is missing", async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole("heading", { name: "Choose each consent separately" })).toBeVisible();
    await consentCard(page, "Camera use").getByRole("checkbox").check();
    await consentCard(page, "Face analysis for this recommendation").getByRole("checkbox").check();
    await expect(page.getByText("Required consent missing")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to home" })).toBeDisabled();
  });

  test("blocks capture setup until lighting readiness is confirmed", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await page.getByRole("button", { name: "Start" }).first().click();
    await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeDisabled();
    await page.goto("/#lighting");

    await expect(page.getByRole("heading", { name: "Confirm lighting before capture" })).toBeVisible();
    await expect(page.getByText("0 of 5 lighting checks confirmed.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to browser capability" })).toBeDisabled();
    await page.getByRole("group", { name: "Required lighting confirmations" }).getByRole("checkbox", { name: /Soft front lighting/ }).check();
    await expect(page.getByRole("button", { name: "Continue to browser capability" })).toBeDisabled();

    for (const checkbox of await page.getByRole("group", { name: "Required lighting confirmations" }).getByRole("checkbox").all()) {
      await checkbox.check();
    }
    await expect(page.getByText("Lighting readiness confirmed for guided RGB capture.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to browser capability" })).toBeEnabled();
  });

  test("reports camera permission denial and keeps upload fallback available", async ({ page }) => {
    await page.addInitScript(() => {
      const deniedStatus = { state: "denied", onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false };
      Object.defineProperty(navigator, "permissions", {
        value: { query: () => Promise.resolve(deniedStatus) },
        configurable: true
      });
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          enumerateDevices: () => Promise.resolve([{ kind: "videoinput", label: "Front camera", deviceId: "synthetic", groupId: "synthetic" }]),
          getUserMedia: () => Promise.reject(new DOMException("Denied by E2E test", "NotAllowedError"))
        },
        configurable: true
      });
    });
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.getByText("Camera permission denied. You can use file upload instead.")).toBeVisible();
    await expect(page.getByText("Use upload fallback: Upload a JPEG, PNG, or WebP image for each required angle.")).toBeVisible();
    await expect(page.getByLabel("Upload straight-on image")).toBeVisible();
  });

  test("rejects unsupported and undersized images, then allows selective retake", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);

    await page.getByLabel("Upload fallback for straight-on").setInputFiles(invalidTextFile());
    await expect(page.getByText("The image could not be read.")).toBeVisible();
    await expect(page.getByText("Choose a different image: Use a readable JPEG, PNG, or WebP file within the size and dimension limits.")).toBeVisible();
    await expect(page.getByLabel("Upload fallback for straight-on")).toHaveAttribute("aria-invalid", "true");

    await uploadFallbackForAngle(page, "Straight-on", syntheticPng("too-small.png", 120, 120, 1));
    await expect(page.getByText("Use an image at least 480 pixels wide and tall.")).toBeVisible();

    const straightOn = syntheticPng("straight-valid.png", 640, 640, 2);
    await uploadFallbackForAngle(page, "Straight-on", straightOn, { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("left-45-valid.png", 640, 640, 3), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Right 45 degrees", straightOn);
    await expect(page.getByText("This image appears to duplicate Straight-on.")).toBeVisible();

    await uploadFallbackForAngle(page, "Right 45 degrees", syntheticPng("right-45-valid.png", 640, 640, 4), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Left profile", syntheticPng("left-profile-valid.png", 640, 640, 5), { waitForAccepted: true });
    await uploadFallbackForAngle(page, "Right profile", syntheticPng("right-profile-valid.png", 640, 640, 6), { waitForAccepted: true });
    await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();

    await page.getByRole("heading", { name: "Left 45 degrees" }).locator("xpath=ancestor::article[contains(@class, 'quality-review-card')]").getByRole("button", { name: "Retake" }).click();
    await expect(page.getByRole("heading", { name: "4 of 5 angles completed" })).toBeVisible();
    await uploadFallbackForAngle(page, "Left 45 degrees", syntheticPng("left-45-retake-valid.png", 640, 640, 7), { waitForAccepted: true });
    await expect(page.getByRole("heading", { name: "5 of 5 angles completed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to attribute confirmation" })).toBeEnabled();
  });

  test("supports keyboard navigation through the main journey", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await page.getByRole("button", { name: "Get Started" }).focus();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "How to Set Up Face ID" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toBeVisible();
    await page.goto("/#product");
    await page.getByRole("button", { name: "Continue to disclaimer" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Independent companion" })).toBeVisible();
  });

  test("exposes angle-specific capture control labels", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    await navigateToCapture(page);

    await expect(page.getByRole("button", { name: "Start camera for Straight-on", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip to file upload for Straight-on", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make Left 45 degrees the current capture angle", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retake Left 45 degrees", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Left 45 degrees capture", exact: true })).toBeVisible();
  });

  test("remains usable with reduced motion preferences", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const prefersReducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(prefersReducedMotion).toBe(true);
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page.getByRole("heading", { name: "How to Set Up Face ID" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toBeVisible();
  });

  test("renders the mobile scan entry without horizontal overflow at supported widths", async ({ page }) => {
    await completeOnboarding(page);
    await acceptRequiredConsent(page);
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1440, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/#start");
      await expect(page.getByRole("heading", { name: "Set Up Your GameFace" })).toBeVisible();
      await page.locator("details.setup-disclosure").evaluate((element) => {
        (element as HTMLDetailsElement).open = true;
      });
      await page.getByRole("radio", { name: /Launch Pack/ }).click();
      await expect(page.getByRole("radio", { name: /Launch Pack/ })).toHaveAttribute("aria-checked", "true");
      await expect(page.getByRole("radio", { name: /All Access/ })).toHaveAttribute("aria-checked", "false");
      await page.getByRole("radio", { name: /All Access/ }).click();
      await expect(page.getByRole("radio", { name: /All Access/ })).toHaveAttribute("aria-checked", "true");
      await expect(page.getByRole("button", { name: "Get Started" })).toBeDisabled();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, `${viewport.width}x${viewport.height}`).toBe(false);
    }
  });

  test("renders the circular guided capture interface without horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1440, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/#capture");
      await expect(page.getByRole("heading", { name: /Position your face within the frame\.|Rotate to portrait/ })).toBeVisible();
      await page.locator("details.setup-disclosure").evaluate((element) => {
        (element as HTMLDetailsElement).open = true;
      });
      await expect(
        page.getByText("Circular progress advances only after a distinct live frame passes face, pose, blur, exposure, and duplicate-angle checks.")
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Accessibility Options" }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, `${viewport.width}x${viewport.height}`).toBe(false);
    }
  });

  test("shows five-slot scan progress and missing angles without developer duplicate jargon", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO !== "true" && process.env.NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS !== "1",
      "Requires setup visual-state test hooks."
    );
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/?setupVisualState=scan-partial#capture");

    await expect(page.getByRole("heading", { name: "Move your head slowly to complete the circle." })).toBeVisible();
    await expect(page.getByLabel("Guided scan progress")).toContainText("40% complete");
    await expect(page.getByLabel("Guided scan progress")).toContainText("2/5 angles");
    await expect(page.getByLabel("Guided scan progress")).toContainText("Captured: Front • Left 45");
    await expect(page.getByLabel("Guided scan progress")).toContainText("Still needed: Left outer • Right 45 • Right outer");
    await expect(page.getByLabel("Guided scan progress")).toContainText("Turn farther left");
    await expect(page.getByText("Duplicate angle ignored")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("loads the FC 26 recipe workflow independently from College Football catalog results", async ({ page }) => {
    await page.goto("/#fc26");

    await expect(page.getByRole("heading", { name: "Build an FC 26 face recipe" })).toBeVisible();
    await expect(page.getByText("EA SPORTS FC 26").first()).toBeVisible();
    await expect(page.getByText("Research-only FC 26 workflow")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Observed FC 26 controls" })).toBeVisible();
    await expect(page.getByText("EA SPORTS College Football 27").first()).toHaveCount(0);
    await expect(page.getByText("Verified College Football 27 catalog not loaded.")).toHaveCount(0);
  });

  test("keeps development-only audit and fixture approval paths out of the production app", async ({ page }) => {
    await page.goto("/#phase-0");

    await expect(page.getByRole("heading", { name: "Phase 0 readiness" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Environment manifest wizard" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Catalog-manager review console" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve release candidate" })).toHaveCount(0);
    await expect(page.getByText("CF27_TESTONLY")).toHaveCount(0);
    await expect(page.getByText("Verified College Football 27 catalog not loaded.")).toBeVisible();
    await expect(page.getByText("Check catalog status later: Keep or delete the local profile, then retry after an approved catalog release is loaded.")).toBeVisible();
  });

  test("keeps fixture-backed staging data disabled in the production app", async ({ page }) => {
    await page.goto("/staging");

    await expect(page.getByRole("heading", { name: "Staging mode is disabled" })).toBeVisible();
    await expect(page.getByText("does not load fixture records unless the app is built")).toBeVisible();
    await expect(page.getByText("synthetic-match-alpha")).toHaveCount(0);
    await expect(page.getByText("synthetic-label-alpha")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Top three closest available settings" })).toHaveCount(0);
  });
});
