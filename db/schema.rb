# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_11_052742) do
  create_table "accounts", force: :cascade do |t|
    t.string "apple_user_id"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "password_digest"
    t.json "settings", default: {"temp_unit" => "c"}, null: false
    t.bigint "sync_version", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["apple_user_id"], name: "index_accounts_on_apple_user_id", unique: true
    t.index ["email"], name: "index_accounts_on_email", unique: true
  end

  create_table "profiles", id: :string, force: :cascade do |t|
    t.integer "account_id", null: false
    t.date "birth_date"
    t.datetime "client_updated_at", null: false
    t.string "color"
    t.string "condition"
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "name", null: false
    t.bigint "server_version", default: 0, null: false
    t.string "sex"
    t.datetime "updated_at", null: false
    t.index ["account_id", "server_version"], name: "index_profiles_on_account_id_and_server_version"
    t.index ["account_id"], name: "index_profiles_on_account_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.integer "account_id", null: false
    t.datetime "created_at", null: false
    t.string "device_name"
    t.datetime "last_used_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_sessions_on_account_id"
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
  end

  add_foreign_key "profiles", "accounts"
  add_foreign_key "sessions", "accounts"
end
