# Shared behavior for client-syncable tables: client-minted uuid PKs,
# per-account version stamping, tombstones, and pull serialization.
module Syncable
  extend ActiveSupport::Concern

  included do
    belongs_to :account
    before_create { self.id ||= SecureRandom.uuid }
    scope :changed_since, ->(version) { where("server_version > ?", version) }
    scope :alive, -> { where(deleted_at: nil) }
  end

  def soft_delete!
    self.deleted_at = Time.current
    self.server_version = account.next_sync_version!
    save!(validate: false)
  end

  # JSON-safe (dates/times as ISO 8601 strings) regardless of serializer.
  def sync_json
    as_json(only: ["id", "client_updated_at", *self.class::SYNC_ATTRIBUTES])
  end
end
