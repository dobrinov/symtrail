class MedicationType < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[label brand form strength default_dose color kind builtin].freeze

  validates :label, presence: true
end
