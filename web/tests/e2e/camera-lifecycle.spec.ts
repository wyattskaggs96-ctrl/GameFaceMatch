import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
  },
  permissions: ["camera"],
  viewport: { width: 430, height: 932 }
});

test("keeps one live video node and stream assignment across capture UI rerenders", async ({ page }) => {
  await page.addInitScript(() => {
    const stats = {
      getUserMediaCalls: 0,
      srcObjectAssignments: 0
    };
    Object.defineProperty(window, "__gfmVideoLifecycleStats", {
      value: stats,
      configurable: true
    });

    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "srcObject");
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return descriptor?.get ? descriptor.get.call(this) : (this as HTMLMediaElement & { __gfmSrcObject?: MediaStream }).__gfmSrcObject;
      },
      set(value) {
        stats.srcObjectAssignments += 1;
        if (descriptor?.set) {
          descriptor.set.call(this, value);
        } else {
          (this as HTMLMediaElement & { __gfmSrcObject?: MediaStream | null }).__gfmSrcObject = value as MediaStream | null;
        }
      }
    });

    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (navigator.mediaDevices && originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = (constraints) => {
        stats.getUserMediaCalls += 1;
        return originalGetUserMedia(constraints);
      };
    }
  });

  await page.goto("/#welcome");
  await page.getByRole("button", { name: "Get Started" }).click();

  const video = page.getByTestId("guided-camera-video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("data-video-node-id", "guided-camera-video-node");
  await page.getByRole("button", { name: "Accessibility Options" }).first().click();
  await expect(page.getByText("Assisted scan mode")).toBeVisible();
  await expect(video).toHaveAttribute("data-video-node-id", "guided-camera-video-node");

  const stats = await page.evaluate(
    () =>
      (window as unknown as { __gfmVideoLifecycleStats: { getUserMediaCalls: number; srcObjectAssignments: number } })
        .__gfmVideoLifecycleStats
  );
  expect(stats).toEqual({
    getUserMediaCalls: 1,
    srcObjectAssignments: 1
  });
});
