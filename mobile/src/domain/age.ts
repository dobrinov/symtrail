// Age display label, port of the prototype's profileRole (docs/prototype/data.jsx).
export function ageLabel(birthDateIso: string | null, today = new Date()): string {
  if (!birthDateIso) return "";
  const birth = new Date(birthDateIso);
  let years = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  if (years >= 1) return `${years} yr${years === 1 ? "" : "s"}`;
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months--;
  return `${Math.max(0, months)} mo`;
}
