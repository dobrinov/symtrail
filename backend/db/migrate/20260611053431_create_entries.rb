class CreateEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :entries, id: :string do |t|
      t.references :account, null: false, foreign_key: true
      t.references :profile, type: :string, null: false, foreign_key: true
      t.string :entry_type, null: false
      t.datetime :recorded_at, null: false
      t.references :symptom_type, type: :string, foreign_key: true
      t.string :severity
      t.decimal :temp_c, precision: 3, scale: 1
      t.references :medication_type, type: :string, foreign_key: true
      t.string :dose
      t.datetime :reminder_at
      t.text :note
      t.bigint :server_version, null: false, default: 0
      t.datetime :client_updated_at, null: false
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :entries, [:account_id, :server_version]
    add_index :entries, [:profile_id, :recorded_at]
  end
end
