import { describe, expect, it } from "vitest";
import {
  effectiveMarketStatus,
  formatCountdown,
  hasRealLockTime,
  isPastLockTime,
  msUntilLock,
} from "../market-lock";

const NOW = new Date("2026-09-13T18:00:00.000Z").getTime();
const EPOCH = new Date(0).toISOString();
const EARLIER = new Date(NOW - 60_000).toISOString();
const LATER = new Date(NOW + 60_000).toISOString();

describe("hasRealLockTime", () => {
  it.each([
    [undefined, false],
    [null, false],
    ["", false],
    [EPOCH, false], // placeholder for "schedule lookup failed"
    ["not-a-date", false],
    [LATER, true],
  ])("treats %s as %s", (value, expected) => {
    expect(hasRealLockTime(value)).toBe(expected);
  });
});

describe("isPastLockTime", () => {
  it("is true once the deadline has passed", () => {
    expect(isPastLockTime(EARLIER, NOW)).toBe(true);
  });

  it("is false before the deadline", () => {
    expect(isPastLockTime(LATER, NOW)).toBe(false);
  });

  it("is true exactly at the deadline", () => {
    expect(isPastLockTime(new Date(NOW).toISOString(), NOW)).toBe(true);
  });

  it("never locks a matchup with no real lock time", () => {
    // The epoch placeholder is in the distant past but means "unknown", so
    // treating it as passed would lock every market permanently.
    expect(isPastLockTime(EPOCH, NOW)).toBe(false);
    expect(isPastLockTime(undefined, NOW)).toBe(false);
  });
});

describe("effectiveMarketStatus", () => {
  it("locks an open market whose deadline has passed", () => {
    expect(effectiveMarketStatus("open", EARLIER, NOW)).toBe("locked");
  });

  it("leaves an open market alone before its deadline", () => {
    expect(effectiveMarketStatus("open", LATER, NOW)).toBe("open");
  });

  it("never reopens a market the commissioner locked", () => {
    expect(effectiveMarketStatus("locked", LATER, NOW)).toBe("locked");
  });

  it("leaves settled and paused markets untouched", () => {
    expect(effectiveMarketStatus("settled", EARLIER, NOW)).toBe("settled");
    expect(effectiveMarketStatus("paused", EARLIER, NOW)).toBe("paused");
  });

  it("leaves an open market with no real deadline open", () => {
    expect(effectiveMarketStatus("open", EPOCH, NOW)).toBe("open");
  });
});

describe("msUntilLock", () => {
  it("counts down for an open market before its deadline", () => {
    expect(msUntilLock("open", LATER, NOW)).toBe(60_000);
  });

  it("returns null once the deadline has passed", () => {
    expect(msUntilLock("open", EARLIER, NOW)).toBeNull();
  });

  it("returns null for a market that isn't open or has no deadline", () => {
    expect(msUntilLock("locked", LATER, NOW)).toBeNull();
    expect(msUntilLock("open", EPOCH, NOW)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it.each([
    [2 * 86_400_000 + 4 * 3_600_000, "2d 4h"],
    [3 * 3_600_000 + 12 * 60_000, "3h 12m"],
    [8 * 60_000, "8m"],
    [30_000, "1m"], // never shows "0m" while betting is still open
  ])("formats %ims as %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
