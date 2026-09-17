import { describe, expect, test } from "@jest/globals";
import { deriveClientFormCapabilities } from "@get-down/shared";

describe("client form capabilities", () => {
  test("derives evening entertainment from band and DJ capabilities", () => {
    expect(deriveClientFormCapabilities({
      ceremonyMusic: false,
      eveningEntertainment: false,
      bagpipes: false,
      videography: false,
      gettingReady: false,
      hasBand: true,
      hasMusicCapability: true,
      requiresMeal: false,
    })).toMatchObject({
      eveningEntertainment: true,
      hasMusicCapability: true,
      hasBand: true,
    });
  });

  test("keeps each specialist section tied to its own group", () => {
    expect(deriveClientFormCapabilities({
      ceremonyMusic: true,
      eveningEntertainment: false,
      bagpipes: true,
      videography: true,
      gettingReady: true,
      hasBand: false,
      hasMusicCapability: false,
      requiresMeal: true,
    })).toEqual({
      ceremonyMusic: true,
      eveningEntertainment: false,
      bagpipes: true,
      videography: true,
      gettingReady: true,
      hasBand: false,
      hasMusicCapability: false,
      requiresMeal: true,
    });
  });
});
