// Built-in symptom & medication catalogues for LOCAL_ONLY mode.
//
// Mirrors the server's Catalogue.seed! (backend/app/services/catalogue.rb).
// Normally these rows arrive via the initial since=0 sync pull; with no backend
// we seed them on-device so the log pickers aren't empty. Keep in sync with the
// backend copy; remove this local seed when the server is restored.
import { Repo } from "./repo";

export const BUILTIN_SYMPTOMS: { icon: string; label: string; groupName: string }[] = [
  { icon: "fever", label: "Fever", groupName: "PFAPA" },
  { icon: "throat", label: "Sore throat", groupName: "PFAPA" },
  { icon: "ulcers", label: "Mouth ulcers", groupName: "PFAPA" },
  { icon: "glands", label: "Swollen glands", groupName: "PFAPA" },
  { icon: "legpain", label: "Leg pain", groupName: "PFAPA" },
  { icon: "tummy", label: "Stomachache", groupName: "PFAPA" },
  { icon: "headache", label: "Headache", groupName: "PFAPA" },
  { icon: "nosebleed", label: "Nosebleed", groupName: "PFAPA" },
  { icon: "cough", label: "Cough", groupName: "Infection" },
  { icon: "runnynose", label: "Runny nose", groupName: "Infection" },
  { icon: "stuffynose", label: "Stuffy nose", groupName: "Infection" },
  { icon: "earpain", label: "Ear pain", groupName: "Infection" },
  { icon: "nausea", label: "Nausea", groupName: "Infection" },
  { icon: "vomiting", label: "Vomiting", groupName: "Infection" },
  { icon: "diarrhea", label: "Diarrhea", groupName: "Infection" },
  { icon: "constipation", label: "Constipation", groupName: "Infection" },
  { icon: "cramps", label: "Cramps", groupName: "General" },
  { icon: "bloating", label: "Bloating", groupName: "General" },
  { icon: "chestpain", label: "Chest pain", groupName: "General" },
  { icon: "palpitations", label: "Palpitations", groupName: "General" },
  { icon: "dizziness", label: "Dizziness", groupName: "General" },
  { icon: "jointpain", label: "Joint pain", groupName: "General" },
  { icon: "hotflashes", label: "Hot flashes", groupName: "General" },
  { icon: "rash", label: "Rash", groupName: "General" },
  { icon: "fatigue", label: "Fatigue", groupName: "General" },
  { icon: "sleepiness", label: "Sleepiness", groupName: "General" },
  { icon: "chills", label: "Chills", groupName: "General" },
  { icon: "appetite", label: "Low appetite", groupName: "General" },
];

export const BUILTIN_MEDICATIONS: {
  label: string; brand: string | null; form: string; defaultDose: string;
  strength: string; color: string; kind: string;
}[] = [
  { label: "Ibuprofen", brand: "Nurofen", form: "syrup", defaultDose: "5 ml", strength: "100mg/5ml", color: "#F2802E", kind: "Pain / fever" },
  { label: "Paracetamol", brand: "Calpol", form: "syrup", defaultDose: "7.5 ml", strength: "120mg/5ml", color: "#FEAE2E", kind: "Pain / fever" },
  { label: "Prednisolone", brand: null, form: "tablet", defaultDose: "15 mg", strength: "5mg", color: "#958CBE", kind: "Steroid · flare" },
  { label: "Amoxicillin", brand: null, form: "syrup", defaultDose: "5 ml", strength: "250mg/5ml", color: "#59586E", kind: "Antibiotic" },
  { label: "Vitamin D", brand: null, form: "drops", defaultDose: "1 drop", strength: "400 IU", color: "#606C83", kind: "Supplement" },
];

// Idempotent: seeds the built-in catalogues once, skipping if any symptom or
// medication type already exists (so re-runs and the eventual server pull don't
// duplicate rows).
export function seedBuiltinCatalogues(repo: Repo): void {
  repo.seedBuiltins(BUILTIN_SYMPTOMS, BUILTIN_MEDICATIONS);
}
