# Built-in symptom and medication catalogues, copied into every new account
# so built-ins and custom items sync identically.
module Catalogue
  SYMPTOMS = [
    { icon: "fever",        label: "Fever",          group: "PFAPA" },
    { icon: "throat",       label: "Sore throat",    group: "PFAPA" },
    { icon: "ulcers",       label: "Mouth ulcers",   group: "PFAPA" },
    { icon: "glands",       label: "Swollen glands", group: "PFAPA" },
    { icon: "legpain",      label: "Leg pain",       group: "PFAPA" },
    { icon: "tummy",        label: "Stomachache",    group: "PFAPA" },
    { icon: "headache",     label: "Headache",       group: "PFAPA" },
    { icon: "nosebleed",    label: "Nosebleed",      group: "PFAPA" },
    { icon: "cough",        label: "Cough",          group: "Infection" },
    { icon: "runnynose",    label: "Runny nose",     group: "Infection" },
    { icon: "stuffynose",   label: "Stuffy nose",    group: "Infection" },
    { icon: "earpain",      label: "Ear pain",       group: "Infection" },
    { icon: "nausea",       label: "Nausea",         group: "Infection" },
    { icon: "vomiting",     label: "Vomiting",       group: "Infection" },
    { icon: "diarrhea",     label: "Diarrhea",       group: "Infection" },
    { icon: "constipation", label: "Constipation",   group: "Infection" },
    { icon: "cramps",       label: "Cramps",         group: "General" },
    { icon: "bloating",     label: "Bloating",       group: "General" },
    { icon: "chestpain",    label: "Chest pain",     group: "General" },
    { icon: "palpitations", label: "Palpitations",   group: "General" },
    { icon: "dizziness",    label: "Dizziness",      group: "General" },
    { icon: "jointpain",    label: "Joint pain",     group: "General" },
    { icon: "hotflashes",   label: "Hot flashes",    group: "General" },
    { icon: "rash",         label: "Rash",           group: "General" },
    { icon: "fatigue",      label: "Fatigue",        group: "General" },
    { icon: "sleepiness",   label: "Sleepiness",     group: "General" },
    { icon: "chills",       label: "Chills",         group: "General" },
    { icon: "appetite",     label: "Low appetite",   group: "General" }
  ].freeze

  MEDICATIONS = [
    { label: "Ibuprofen",    brand: "Nurofen", form: "syrup",  default_dose: "5 ml",
      strength: "100mg/5ml", color: "#F2802E", kind: "Pain / fever" },
    { label: "Paracetamol",  brand: "Calpol",  form: "syrup",  default_dose: "7.5 ml",
      strength: "120mg/5ml", color: "#FEAE2E", kind: "Pain / fever" },
    { label: "Prednisolone", brand: nil,       form: "tablet", default_dose: "15 mg",
      strength: "5mg",       color: "#958CBE", kind: "Steroid · flare" },
    { label: "Amoxicillin",  brand: nil,       form: "syrup",  default_dose: "5 ml",
      strength: "250mg/5ml", color: "#59586E", kind: "Antibiotic" },
    { label: "Vitamin D",    brand: nil,       form: "drops",  default_dose: "1 drop",
      strength: "400 IU",    color: "#606C83", kind: "Supplement" }
  ].freeze

  def self.seed!(account)
    now = Time.current
    SYMPTOMS.each do |s|
      account.symptom_types.create!(
        label: s[:label], icon: s[:icon], group_name: s[:group], builtin: true,
        client_updated_at: now, server_version: account.next_sync_version!
      )
    end
    MEDICATIONS.each do |m|
      account.medication_types.create!(
        m.slice(:label, :brand, :form, :strength, :default_dose, :color, :kind)
         .merge(builtin: true, client_updated_at: now,
                server_version: account.next_sync_version!)
      )
    end
  end
end
