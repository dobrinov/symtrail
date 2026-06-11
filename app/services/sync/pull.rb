module Sync
  class Pull
    TABLES = {
      "profiles" => Profile,
      "symptom_types" => SymptomType,
      "medication_types" => MedicationType,
      "entries" => Entry
    }.freeze

    def initialize(account, since:)
      @account = account
      @since = since.to_i
    end

    def call
      changes = TABLES.transform_values do |klass|
        rows = klass.where(account: @account).changed_since(@since)
        {
          "updated" => rows.alive.map(&:sync_json),
          "deleted" => rows.where.not(deleted_at: nil).pluck(:id)
        }
      end
      { "changes" => changes, "cursor" => @account.reload.sync_version }
    end
  end
end
