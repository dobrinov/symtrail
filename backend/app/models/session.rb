class Session < ApplicationRecord
  belongs_to :account

  def self.start!(account:, device_name: nil)
    raw = SecureRandom.base58(36)
    session = create!(account: account, device_name: device_name,
                      token_digest: digest(raw), last_used_at: Time.current)
    [session, raw]
  end

  def self.find_by_token(raw)
    find_by(token_digest: digest(raw.to_s))
  end

  def self.digest(raw)
    Digest::SHA256.hexdigest(raw)
  end
end
