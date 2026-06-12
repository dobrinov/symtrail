class CreateProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :profiles, id: :string do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.string :sex
      t.string :color
      t.date :birth_date
      t.string :condition
      t.bigint :server_version, null: false, default: 0
      t.datetime :client_updated_at, null: false
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :profiles, [:account_id, :server_version]
  end
end
