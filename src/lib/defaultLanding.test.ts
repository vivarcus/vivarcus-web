import { afterEach, describe, expect, it } from "vitest";
import {
  consumePendingDefaultLanding,
  isPendingDefaultLanding,
  markPendingDefaultLanding,
  shouldHoldDefaultLandingOutlet,
} from "./defaultLanding";

afterEach(() => {
  sessionStorage.clear();
});

describe("defaultLanding", () => {
  it("marks, peeks, and consumes pending landing once", () => {
    expect(isPendingDefaultLanding()).toBe(false);
    markPendingDefaultLanding();
    expect(isPendingDefaultLanding()).toBe(true);
    expect(consumePendingDefaultLanding()).toBe(true);
    expect(isPendingDefaultLanding()).toBe(false);
    expect(consumePendingDefaultLanding()).toBe(false);
  });

  it("resolveDefaultLandingRoute falls back to / without vault", async () => {
    const { resolveDefaultLandingRoute } = await import("./defaultLanding");
    await expect(resolveDefaultLandingRoute(null)).resolves.toBe("/");
    await expect(resolveDefaultLandingRoute(undefined)).resolves.toBe("/");
  });

  it("holds outlet on root until non-root landing is known", () => {
    expect(
      shouldHoldDefaultLandingOutlet({
        hold: true,
        pathname: "/",
        navReady: false,
      }),
    ).toBe(true);
    expect(
      shouldHoldDefaultLandingOutlet({
        hold: true,
        pathname: "/",
        navReady: true,
        landingRoute: "/vault-ai",
      }),
    ).toBe(true);
    expect(
      shouldHoldDefaultLandingOutlet({
        hold: true,
        pathname: "/",
        navReady: true,
        landingRoute: "/",
      }),
    ).toBe(false);
    expect(
      shouldHoldDefaultLandingOutlet({
        hold: true,
        pathname: "/vault-ai",
        navReady: true,
        landingRoute: "/vault-ai",
      }),
    ).toBe(false);
    expect(
      shouldHoldDefaultLandingOutlet({
        hold: false,
        pathname: "/",
        navReady: false,
      }),
    ).toBe(false);
  });
});
