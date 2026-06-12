class Entry < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[profile_id entry_type recorded_at symptom_type_id severity
                       temp_c medication_type_id dose reminder_at note].freeze

  ENTRY_TYPES = %w[symptom temp med note].freeze
  SEVERITIES = %w[mild moderate high severe].freeze

  belongs_to :profile
  belongs_to :symptom_type, optional: true
  belongs_to :medication_type, optional: true

  validates :entry_type, inclusion: { in: ENTRY_TYPES }
  validates :recorded_at, presence: true

  with_options if: -> { entry_type == "symptom" } do
    validates :symptom_type_id, presence: true
    validates :severity, inclusion: { in: SEVERITIES }
  end
  validates :temp_c, presence: true,
                     numericality: { greater_than: 30, less_than: 45 },
                     if: -> { entry_type == "temp" }
  validates :medication_type_id, presence: true, if: -> { entry_type == "med" }
  validates :note, presence: true, if: -> { entry_type == "note" }

  validate :references_stay_in_account

  private

  def references_stay_in_account
    { profile: profile, symptom_type: symptom_type, medication_type: medication_type }.each do |name, record|
      errors.add(name, "must belong to the same account") if record && record.account_id != account_id
    end
  end
end
