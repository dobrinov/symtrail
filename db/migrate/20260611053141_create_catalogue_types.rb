class CreateCatalogueTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :symptom_types, id: :string do |t|
      t.references :account, null: false, foreign_key: true
      t.string :label, null: false
      t.string :icon
      t.string :group_name
      t.boolean :builtin, null: false, default: false
      t.bigint :server_version, null: false, default: 0
      t.datetime :client_updated_at, null: false
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :symptom_types, [:account_id, :server_version]

    create_table :medication_types, id: :string do |t|
      t.references :account, null: false, foreign_key: true
      t.string :label, null: false
      t.string :brand
      t.string :form
      t.string :strength
      t.string :default_dose
      t.string :color
      t.string :kind
      t.boolean :builtin, null: false, default: false
      t.bigint :server_version, null: false, default: 0
      t.datetime :client_updated_at, null: false
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :medication_types, [:account_id, :server_version]
  end
end
