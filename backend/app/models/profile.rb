class Profile < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[name sex color birth_date condition].freeze

  validates :name, presence: true
  validates :sex, inclusion: { in: %w[male female] }, allow_nil: true
end
