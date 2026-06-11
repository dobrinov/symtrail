class SymptomType < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[label icon group_name builtin].freeze

  validates :label, presence: true
end
