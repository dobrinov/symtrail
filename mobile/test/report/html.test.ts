import { buildReportHtml } from "../../src/report/html";

test("report contains profile, flare summary, and entries", () => {
  const html = buildReportHtml({
    profile: { id: "p1", name: "Leo", sex: "male", color: "#FEAE2E", birthDate: "2021-02-20", condition: "PFAPA" },
    tempUnit: "c",
    flares: [{ onset: new Date("2026-05-11"), end: new Date("2026-05-14"), peak: 40.2, lengthDays: 4 }],
    stats: { avg: 36, min: 35, max: 37, last: new Date("2026-05-11"), sinceLast: 30, predicted: new Date("2026-06-16"), windowStart: new Date("2026-06-15"), windowEnd: new Date("2026-06-17") },
    entries: [{ id: "e1", profileId: "p1", entryType: "temp", recordedAt: "2026-05-11T08:00:00Z", tempC: 39.4, symptomTypeId: null, severity: null, medicationTypeId: null, dose: null, reminderAt: null, note: null }],
    labels: {},
  });
  expect(html).toContain("Leo");
  expect(html).toContain("PFAPA");
  expect(html).toContain("39.4");
  expect(html).toContain("40.2");
  expect(html).toContain("<svg"); // temp chart present
});

test("report escapes HTML in user-entered text", () => {
  const html = buildReportHtml({
    profile: { id: "p1", name: "<script>x</script>", sex: null, color: null, birthDate: null, condition: null },
    tempUnit: "c", flares: [], stats: null,
    entries: [{ id: "e1", profileId: "p1", entryType: "note", recordedAt: "2026-05-11T08:00:00Z", tempC: null, symptomTypeId: null, severity: null, medicationTypeId: null, dose: null, reminderAt: "<b>", note: "fever & chills <hr>" }],
    labels: {},
  });
  expect(html).not.toContain("<script>x</script>");
  expect(html).toContain("&lt;script&gt;"); // escaped
  expect(html).toContain("fever &amp; chills");
});

test("report escapes custom catalogue labels and dose strings", () => {
  const html = buildReportHtml({
    profile: { id: "p1", name: "Leo", sex: null, color: null, birthDate: null, condition: null },
    tempUnit: "c", flares: [], stats: null,
    entries: [
      { id: "e1", profileId: "p1", entryType: "symptom", recordedAt: "2026-05-11T08:00:00Z", tempC: null, symptomTypeId: "s1", severity: "mild", medicationTypeId: null, dose: null, reminderAt: null, note: null },
      { id: "e2", profileId: "p1", entryType: "med", recordedAt: "2026-05-11T09:00:00Z", tempC: null, symptomTypeId: null, severity: null, medicationTypeId: "m1", dose: "5 ml <hr>", reminderAt: null, note: null },
    ],
    labels: { s1: "<b>Headache</b>", m1: "Drug & Co" },
  });
  expect(html).not.toContain("<b>Headache</b>");
  expect(html).toContain("&lt;b&gt;Headache&lt;/b&gt;");
  expect(html).toContain("Drug &amp; Co");
  expect(html).not.toContain("5 ml <hr>");
  expect(html).toContain("5 ml &lt;hr&gt;");
});
