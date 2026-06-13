import { ageLabel } from "../../src/domain/age";

test("years for >= 1 yr, months under 1 yr, empty without birth date", () => {
  const today = new Date(2026, 5, 10); // June 10 2026
  expect(ageLabel("2021-02-20", today)).toBe("5 yrs");
  expect(ageLabel("2025-09-05", today)).toBe("9 mo");
  expect(ageLabel("2025-06-15", today)).toBe("11 mo");
  expect(ageLabel(null, today)).toBe("");
});

test("singular year", () => {
  expect(ageLabel("2025-06-01", new Date(2026, 5, 10))).toBe("1 yr");
});
