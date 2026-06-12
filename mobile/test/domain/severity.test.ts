import { tempToSeverity, SEVERITY, SEVERITY_ORDER } from "../../src/domain/severity";

test("temperature buckets match the prototype boundaries", () => {
  expect(tempToSeverity(null)).toBe("none");
  expect(tempToSeverity(36.9)).toBe("none");
  expect(tempToSeverity(37.0)).toBe("mild");
  expect(tempToSeverity(37.9)).toBe("mild");
  expect(tempToSeverity(38.0)).toBe("moderate");
  expect(tempToSeverity(38.9)).toBe("moderate");
  expect(tempToSeverity(39.0)).toBe("high");
  expect(tempToSeverity(39.9)).toBe("high");
  expect(tempToSeverity(40.0)).toBe("severe");
});

test("severity scale has the prototype's colors and order", () => {
  expect(SEVERITY_ORDER).toEqual(["none", "mild", "moderate", "high", "severe"]);
  expect(SEVERITY.moderate.color).toBe("#FEAE2E");
  expect(SEVERITY.severe.color).toBe("#E1542E");
});
