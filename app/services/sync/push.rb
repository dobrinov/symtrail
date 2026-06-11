module Sync
  # Applies a batch of client changes. Per-record last-write-wins on
  # client_updated_at; invalid records are rejected individually while the
  # rest of the batch still applies. Parents before children.
  class Push
    APPLY_ORDER = %w[profiles symptom_types medication_types entries].freeze

    def initialize(account, changes:)
      @account = account
      @changes = changes
      @accepted = []
      @rejected = []
    end

    def call
      ActiveRecord::Base.transaction do
        APPLY_ORDER.each do |table|
          klass = Pull::TABLES.fetch(table)
          table_changes = @changes[table] || {}
          Array(table_changes["updated"]).each { |attrs| apply_update(klass, attrs) }
          Array(table_changes["deleted"]).each { |id| apply_delete(klass, id) }
        end
      end
      { "accepted" => @accepted, "rejected" => @rejected }
    end

    private

    def apply_update(klass, attrs)
      id = attrs["id"].to_s
      incoming_at = parse_time(attrs["client_updated_at"])
      return reject(id, "invalid") if id.blank? || incoming_at.nil?

      record = klass.where(account: @account).find_by(id: id) ||
               klass.new(id: id, account: @account)

      if record.persisted?
        return reject(id, "stale") if record.client_updated_at > incoming_at
        return @accepted << id if record.client_updated_at == incoming_at # no-op retry
      end

      record.assign_attributes(attrs.slice(*klass::SYNC_ATTRIBUTES))
      record.client_updated_at = incoming_at
      record.deleted_at = nil
      record.server_version = @account.next_sync_version!
      record.save ? @accepted << id : reject(id, "invalid")
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::InvalidForeignKey
      reject(id, "invalid")
    end

    def apply_delete(klass, id)
      record = klass.where(account: @account).find_by(id: id)
      record&.soft_delete!
      @accepted << id # absent record means already gone: idempotent success
    end

    def reject(id, reason)
      @rejected << { "id" => id, "reason" => reason }
    end

    def parse_time(value)
      Time.zone.parse(value.to_s)
    rescue ArgumentError
      nil
    end
  end
end
