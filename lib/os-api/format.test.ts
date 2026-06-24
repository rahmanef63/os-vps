import { describe, expect, it } from "vitest";
import {
  clampPct,
  fmtGiB,
  fmtGiBPair,
  fmtMBs,
  fmtPct,
  fmtUptime,
  toGiB,
} from "./format";

const GiB = 1024 ** 3;

describe("fmtGiB", () => {
  it("formats 0 bytes", () => {
    expect(fmtGiB(0)).toBe("0.0 GB");
  });

  it("formats exactly 1 GiB", () => {
    expect(fmtGiB(GiB)).toBe("1.0 GB");
  });

  it("formats 1.5 GiB with correct rounding", () => {
    expect(fmtGiB(1.5 * GiB)).toBe("1.5 GB");
  });

  it("rounds at one decimal place (1.45 GiB → 1.4 due to IEEE 754 float precision)", () => {
    // 1.45 * GiB in IEEE 754 binary is slightly below 1.45 in decimal, so
    // toFixed(1) correctly yields "1.4", not "1.5". This is expected behavior.
    expect(fmtGiB(1.45 * GiB)).toBe("1.4 GB");
  });

  it("large value", () => {
    expect(fmtGiB(8 * GiB)).toBe("8.0 GB");
  });
});

describe("toGiB", () => {
  it("returns 0 for 0 bytes", () => {
    expect(toGiB(0)).toBe(0);
  });

  it("returns 1 for exactly 1 GiB", () => {
    expect(toGiB(GiB)).toBe(1);
  });

  it("returns a numeric float for 1.5 GiB", () => {
    expect(toGiB(1.5 * GiB)).toBeCloseTo(1.5);
  });

  it("returns a number, not a string", () => {
    expect(typeof toGiB(GiB)).toBe("number");
  });
});

describe("fmtGiBPair", () => {
  it("formats used/total as 'X.X / Y GB'", () => {
    expect(fmtGiBPair(1.5 * GiB, 8 * GiB)).toBe("1.5 / 8 GB");
  });

  it("zero used / zero total", () => {
    expect(fmtGiBPair(0, 0)).toBe("0.0 / 0 GB");
  });

  it("total is rounded to 0 decimals", () => {
    // 16 GiB total → "16 GB" (no decimal)
    expect(fmtGiBPair(0, 16 * GiB)).toBe("0.0 / 16 GB");
  });

  it("used is rounded to 1 decimal", () => {
    // 2.75 GiB used → "2.8"
    expect(fmtGiBPair(2.75 * GiB, 4 * GiB)).toBe("2.8 / 4 GB");
  });
});

describe("fmtPct", () => {
  it("formats 0%", () => {
    expect(fmtPct(0)).toBe("0%");
  });

  it("formats 100%", () => {
    expect(fmtPct(100)).toBe("100%");
  });

  it("rounds fractional percent", () => {
    expect(fmtPct(49.4)).toBe("49%");
    expect(fmtPct(49.5)).toBe("50%");
  });

  it("rounds 66.6 → 67", () => {
    expect(fmtPct(66.6)).toBe("67%");
  });
});

describe("fmtMBs", () => {
  it("formats to one decimal place", () => {
    expect(fmtMBs(1.0)).toBe("1.0 MB/s");
  });

  it("formats zero", () => {
    expect(fmtMBs(0)).toBe("0.0 MB/s");
  });

  it("preserves one decimal on a round value", () => {
    expect(fmtMBs(12)).toBe("12.0 MB/s");
  });

  it("rounds at the first decimal", () => {
    expect(fmtMBs(3.14)).toBe("3.1 MB/s");
  });
});

describe("clampPct", () => {
  it("clamps below 0 → 0", () => {
    expect(clampPct(-1)).toBe(0);
    expect(clampPct(-100)).toBe(0);
  });

  it("clamps above 100 → 100", () => {
    expect(clampPct(101)).toBe(100);
    expect(clampPct(999)).toBe(100);
  });

  it("identity in range", () => {
    expect(clampPct(0)).toBe(0);
    expect(clampPct(50)).toBe(50);
    expect(clampPct(100)).toBe(100);
  });

  it("identity for fractional in range", () => {
    expect(clampPct(33.3)).toBeCloseTo(33.3);
  });
});

describe("fmtUptime", () => {
  it("under 1 hour → Nh only", () => {
    // 30 minutes
    expect(fmtUptime(30 * 60 * 1000)).toBe("0h");
  });

  it("exactly 1 hour → '1h'", () => {
    expect(fmtUptime(3600 * 1000)).toBe("1h");
  });

  it("3 hours 30 min → '3h' (no days)", () => {
    expect(fmtUptime(3.5 * 3600 * 1000)).toBe("3h");
  });

  it("exactly 1 day boundary → '1d 0h'", () => {
    expect(fmtUptime(86400 * 1000)).toBe("1d 0h");
  });

  it("1 day 5 hours → '1d 5h'", () => {
    expect(fmtUptime((86400 + 5 * 3600) * 1000)).toBe("1d 5h");
  });

  it("multiple days → 'Nd Nh'", () => {
    expect(fmtUptime((3 * 86400 + 2 * 3600) * 1000)).toBe("3d 2h");
  });

  it("0 ms → '0h'", () => {
    expect(fmtUptime(0)).toBe("0h");
  });
});
