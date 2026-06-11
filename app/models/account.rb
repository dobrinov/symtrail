class Account < ApplicationRecord
  has_secure_password validations: false

  normalizes :email, with: ->(e) { e.strip.downcase }

  validates :email, presence: true, uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :apple_user_id, uniqueness: true, allow_nil: true
  validates :password, presence: true, on: :create, unless: :apple_user_id?
  validates :password, length: { minimum: 8 }, allow_nil: true

  # Atomically allocate the next per-account sync version. SQLite is
  # single-writer, so a SQL-level increment is race-free. Refreshes only
  # sync_version (no full reload), preserving callers' unsaved changes.
  def next_sync_version!
    self.class.where(id: id).update_all("sync_version = sync_version + 1")
    self.sync_version = self.class.where(id: id).pick(:sync_version)
  end
end
