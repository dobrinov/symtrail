class CreateAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :accounts do |t|
      t.string :email, null: false
      t.string :password_digest
      t.string :apple_user_id
      t.json :settings, null: false, default: { temp_unit: "c" }
      t.bigint :sync_version, null: false, default: 0
      t.timestamps
    end
    add_index :accounts, :email, unique: true
    add_index :accounts, :apple_user_id, unique: true
  end
end
