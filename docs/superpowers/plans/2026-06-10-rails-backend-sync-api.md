# Rails Backend + Sync API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Symtrail Rails 8 backend: accounts (email/password + Sign in with Apple), per-account seeded catalogues, and an offline-first pull/push sync API with last-write-wins conflict resolution.

**Architecture:** One Rails 8 app. JSON API under `Api::V1` (controllers inherit `ActionController::API`), landing page added later at `/` (sub-project C). SQLite in WAL mode; Solid Queue for the tombstone purge job; opaque hashed bearer tokens; sync via per-account monotonic `sync_version` cursor and per-record LWW on `client_updated_at`.

**Tech Stack:** Rails 8, SQLite, Minitest, bcrypt, jwt (Apple JWKS verification), rack-attack, litestream.

**Spec:** `docs/superpowers/specs/2026-06-10-rails-backend-sync-api-design.md`

---

## File structure

```
app/controllers/api/v1/base_controller.rb            — auth + error envelope
app/controllers/api/v1/auth/registrations_controller.rb  — signup
app/controllers/api/v1/auth/sessions_controller.rb       — signin/signout
app/controllers/api/v1/auth/apple_controller.rb          — Sign in with Apple
app/controllers/api/v1/auth/password_resets_controller.rb
app/controllers/api/v1/accounts_controller.rb        — show/update settings/destroy
app/controllers/api/v1/sync_controller.rb            — pull/push
app/models/account.rb
app/models/session.rb
app/models/concerns/syncable.rb                      — shared sync columns behavior
app/models/profile.rb
app/models/symptom_type.rb
app/models/medication_type.rb
app/models/entry.rb
app/services/catalogue.rb                            — built-in symptom/med seeding
app/services/apple_token_verifier.rb
app/services/sync/pull.rb
app/services/sync/push.rb
app/jobs/purge_tombstones_job.rb
app/mailers/password_reset_mailer.rb
config/initializers/rack_attack.rb
test/integration/...                                 — request specs (backbone)
test/models/...                                      — model validations
```

---

### Task 1: Rails 8 app scaffold

**Files:**
- Create: entire Rails app skeleton in repo root (`rails new .`)
- Modify: `Gemfile`

- [ ] **Step 1: Verify toolchain**

Run: `ruby -v && gem list rails`
Expected: Ruby >= 3.2. If Rails 8 is not installed: `gem install rails -v "~> 8.0"`

- [ ] **Step 2: Generate the app in the repo root**

Run (from repo root, which already contains `docs/` and `.git/`):

```bash
rails new . --name symtrail --skip-kamal --skip-jbuilder --skip-action-mailbox --skip-action-text --skip-active-storage --skip-action-cable
```

If prompted about existing files, keep existing (`n` for overwrite of anything under `docs/`; there should be no conflicts).

- [ ] **Step 3: Add gems**

Run:

```bash
bundle add bcrypt jwt rack-attack
```

- [ ] **Step 4: Verify the app boots and tests run**

Run: `bin/rails db:prepare && bin/rails test`
Expected: `0 runs, 0 assertions, 0 failures` (or similar empty-suite output), no errors.

- [ ] **Step 5: Add shared test helpers**

Modify `test/test_helper.rb` — add inside the file, after the existing `module ActiveSupport` block:

```ruby
module ApiTestHelpers
  def api_signup(email: "parent@example.com", password: "secret123")
    post "/api/v1/auth/signup", params: { email: email, password: password }
    body = JSON.parse(response.body)
    [Account.find(body.dig("account", "id")), body["token"]]
  end

  def auth_headers(token)
    { "Authorization" => "Bearer #{token}" }
  end

  def json
    JSON.parse(response.body)
  end
end

class ActionDispatch::IntegrationTest
  include ApiTestHelpers
end
```

(This references `Account` and the signup route built in later tasks; it only loads lazily inside tests, so the suite stays green until then.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Rails 8 app with bcrypt, jwt, rack-attack"
```

---

### Task 2: Account model

**Files:**
- Create: `db/migrate/*_create_accounts.rb`, `app/models/account.rb`
- Test: `test/models/account_test.rb`

- [ ] **Step 1: Generate model skeleton**

Run: `bin/rails g model Account --no-fixture`

Replace the generated migration contents with:

```ruby
class CreateAccounts < ActiveRecord::Migration[8.0]
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
```

- [ ] **Step 2: Write failing model tests**

Create `test/models/account_test.rb`:

```ruby
require "test_helper"

class AccountTest < ActiveSupport::TestCase
  test "valid with email and password" do
    account = Account.new(email: "A@Example.com ", password: "secret123")
    assert account.valid?
    assert account.save
    assert_equal "a@example.com", account.email
  end

  test "requires password on create unless apple account" do
    assert_not Account.new(email: "a@example.com").valid?
    assert Account.new(email: "a@example.com", apple_user_id: "apple-123").valid?
  end

  test "rejects short passwords" do
    assert_not Account.new(email: "a@example.com", password: "short").valid?
  end

  test "rejects duplicate emails" do
    Account.create!(email: "a@example.com", password: "secret123")
    assert_not Account.new(email: "a@example.com", password: "secret123").valid?
  end

  test "next_sync_version! increments atomically and returns the new value" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal 1, account.next_sync_version!
    assert_equal 2, account.next_sync_version!
    assert_equal 2, account.reload.sync_version
  end

  test "default settings" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal "c", account.settings["temp_unit"]
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bin/rails db:migrate && bin/rails test test/models/account_test.rb`
Expected: FAIL (validations and `next_sync_version!` missing).

- [ ] **Step 4: Implement the model**

Replace `app/models/account.rb`:

```ruby
class Account < ApplicationRecord
  has_secure_password validations: false

  normalizes :email, with: ->(e) { e.strip.downcase }

  validates :email, presence: true, uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, presence: true, on: :create, unless: :apple_user_id?
  validates :password, length: { minimum: 8 }, allow_nil: true

  # Atomically allocate the next per-account sync version. SQLite is
  # single-writer, so a SQL-level increment is race-free.
  def next_sync_version!
    self.class.where(id: id).update_all("sync_version = sync_version + 1")
    reload.sync_version
  end
end
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bin/rails test test/models/account_test.rb`
Expected: PASS (6 runs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Account model with auth validations and sync version counter"
```

---

### Task 3: Session model (opaque hashed bearer tokens)

**Files:**
- Create: `db/migrate/*_create_sessions.rb`, `app/models/session.rb`
- Test: `test/models/session_test.rb`

- [ ] **Step 1: Generate model skeleton**

Run: `bin/rails g model Session --no-fixture`

Replace the generated migration contents with:

```ruby
class CreateSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :sessions do |t|
      t.references :account, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.string :device_name
      t.datetime :last_used_at
      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true
  end
end
```

- [ ] **Step 2: Write failing model tests**

Create `test/models/session_test.rb`:

```ruby
require "test_helper"

class SessionTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
  end

  test "start! returns session and raw token, stores only the digest" do
    session, raw = Session.start!(account: @account, device_name: "iPhone")
    assert session.persisted?
    assert raw.length >= 32
    assert_not_equal raw, session.token_digest
    assert_equal session, Session.find_by_token(raw)
  end

  test "find_by_token returns nil for unknown token" do
    assert_nil Session.find_by_token("nonsense")
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bin/rails db:migrate && bin/rails test test/models/session_test.rb`
Expected: FAIL (`start!` undefined).

- [ ] **Step 4: Implement the model**

Replace `app/models/session.rb`:

```ruby
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bin/rails test test/models/session_test.rb`
Expected: PASS (2 runs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Session model with hashed opaque bearer tokens"
```

---

### Task 4: Syncable concern + Profile model

**Files:**
- Create: `app/models/concerns/syncable.rb`, `app/models/profile.rb`, `db/migrate/*_create_profiles.rb`
- Modify: `app/models/account.rb`
- Test: `test/models/profile_test.rb`

- [ ] **Step 1: Create the migration**

Run: `bin/rails g migration CreateProfiles`

Replace contents:

```ruby
class CreateProfiles < ActiveRecord::Migration[8.0]
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
```

- [ ] **Step 2: Write failing tests**

Create `test/models/profile_test.rb`:

```ruby
require "test_helper"

class ProfileTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
  end

  test "auto-generates a uuid id when none supplied" do
    p = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    assert_match(/\A[0-9a-f-]{36}\z/, p.id)
  end

  test "keeps a client-supplied id" do
    id = SecureRandom.uuid
    p = @account.profiles.create!(id: id, name: "Leo", client_updated_at: Time.current)
    assert_equal id, p.id
  end

  test "changed_since returns rows above the version cursor" do
    p1 = @account.profiles.new(name: "Leo", client_updated_at: Time.current)
    p1.server_version = @account.next_sync_version!
    p1.save!
    cursor = @account.sync_version
    p2 = @account.profiles.new(name: "Mia", client_updated_at: Time.current)
    p2.server_version = @account.next_sync_version!
    p2.save!
    assert_equal [p2], @account.profiles.changed_since(cursor).to_a
  end

  test "soft_delete! sets tombstone and bumps server_version" do
    p = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    before = @account.reload.sync_version
    p.soft_delete!
    assert p.deleted_at.present?
    assert_operator p.server_version, :>, before
  end

  test "sync_json contains only synced attributes" do
    p = @account.profiles.create!(name: "Leo", sex: "male", color: "#FEAE2E",
                                  birth_date: Date.new(2021, 2, 20), condition: "PFAPA",
                                  client_updated_at: Time.current)
    keys = p.sync_json.keys
    assert_includes keys, "id"
    assert_includes keys, "client_updated_at"
    assert_includes keys, "name"
    assert_not_includes keys, "account_id"
    assert_not_includes keys, "server_version"
  end

  test "validates sex values" do
    assert_not @account.profiles.new(name: "X", sex: "other", client_updated_at: Time.current).valid?
    assert @account.profiles.new(name: "X", sex: nil, client_updated_at: Time.current).valid?
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bin/rails db:migrate && bin/rails test test/models/profile_test.rb`
Expected: FAIL (Profile class missing).

- [ ] **Step 4: Implement concern and model**

Create `app/models/concerns/syncable.rb`:

```ruby
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

  def sync_json
    attributes.slice("id", "client_updated_at", *self.class::SYNC_ATTRIBUTES)
  end
end
```

Create `app/models/profile.rb`:

```ruby
class Profile < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[name sex color birth_date condition].freeze

  validates :name, presence: true
  validates :sex, inclusion: { in: %w[male female] }, allow_nil: true
end
```

Add to `app/models/account.rb` (inside the class, at the top; deletion order matters — children before parents, see Task 11):

```ruby
has_many :sessions, dependent: :delete_all
has_many :profiles, dependent: :delete_all
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bin/rails test test/models/profile_test.rb`
Expected: PASS (6 runs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Syncable concern and Profile model"
```

---

### Task 5: SymptomType + MedicationType models

**Files:**
- Create: `db/migrate/*_create_catalogue_types.rb`, `app/models/symptom_type.rb`, `app/models/medication_type.rb`
- Modify: `app/models/account.rb`
- Test: `test/models/catalogue_types_test.rb`

- [ ] **Step 1: Create the migration**

Run: `bin/rails g migration CreateCatalogueTypes`

Replace contents:

```ruby
class CreateCatalogueTypes < ActiveRecord::Migration[8.0]
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
```

- [ ] **Step 2: Write failing tests**

Create `test/models/catalogue_types_test.rb`:

```ruby
require "test_helper"

class CatalogueTypesTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
  end

  test "symptom type requires label" do
    assert_not @account.symptom_types.new(client_updated_at: Time.current).valid?
    assert @account.symptom_types.new(label: "Fever", icon: "fever", group_name: "PFAPA",
                                      client_updated_at: Time.current).valid?
  end

  test "medication type requires label" do
    assert_not @account.medication_types.new(client_updated_at: Time.current).valid?
    assert @account.medication_types.new(label: "Ibuprofen", form: "syrup",
                                         client_updated_at: Time.current).valid?
  end

  test "both are syncable" do
    s = @account.symptom_types.create!(label: "Fever", client_updated_at: Time.current)
    m = @account.medication_types.create!(label: "Ibuprofen", client_updated_at: Time.current)
    assert_match(/\A[0-9a-f-]{36}\z/, s.id)
    assert_includes m.sync_json.keys, "default_dose"
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bin/rails db:migrate && bin/rails test test/models/catalogue_types_test.rb`
Expected: FAIL (classes missing).

- [ ] **Step 4: Implement the models**

Create `app/models/symptom_type.rb`:

```ruby
class SymptomType < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[label icon group_name builtin].freeze

  validates :label, presence: true
end
```

Create `app/models/medication_type.rb`:

```ruby
class MedicationType < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[label brand form strength default_dose color kind builtin].freeze

  validates :label, presence: true
end
```

Add to `app/models/account.rb`, after `has_many :profiles`:

```ruby
has_many :symptom_types, dependent: :delete_all
has_many :medication_types, dependent: :delete_all
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bin/rails test test/models/catalogue_types_test.rb`
Expected: PASS (3 runs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: SymptomType and MedicationType catalogue models"
```

---

### Task 6: Entry model

**Files:**
- Create: `db/migrate/*_create_entries.rb`, `app/models/entry.rb`
- Modify: `app/models/account.rb`
- Test: `test/models/entry_test.rb`

- [ ] **Step 1: Create the migration**

Run: `bin/rails g migration CreateEntries`

Replace contents:

```ruby
class CreateEntries < ActiveRecord::Migration[8.0]
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
```

- [ ] **Step 2: Write failing tests**

Create `test/models/entry_test.rb`:

```ruby
require "test_helper"

class EntryTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
    @profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    @symptom = @account.symptom_types.create!(label: "Sore throat", client_updated_at: Time.current)
    @med = @account.medication_types.create!(label: "Ibuprofen", client_updated_at: Time.current)
  end

  def build(attrs)
    @account.entries.new({ profile: @profile, recorded_at: Time.current,
                           client_updated_at: Time.current }.merge(attrs))
  end

  test "symptom entry requires symptom_type and valid severity" do
    assert_not build(entry_type: "symptom").valid?
    assert_not build(entry_type: "symptom", symptom_type: @symptom, severity: "extreme").valid?
    assert build(entry_type: "symptom", symptom_type: @symptom, severity: "mild").valid?
  end

  test "temp entry requires plausible temp_c" do
    assert_not build(entry_type: "temp").valid?
    assert_not build(entry_type: "temp", temp_c: 99).valid?
    assert build(entry_type: "temp", temp_c: 38.5).valid?
  end

  test "med entry requires medication_type" do
    assert_not build(entry_type: "med").valid?
    assert build(entry_type: "med", medication_type: @med, dose: "5 ml").valid?
  end

  test "note entry requires note text" do
    assert_not build(entry_type: "note").valid?
    assert build(entry_type: "note", note: "Off his dinner").valid?
  end

  test "rejects unknown entry types" do
    assert_not build(entry_type: "weight").valid?
  end

  test "rejects references to another account's records" do
    other = Account.create!(email: "b@example.com", password: "secret123")
    other_profile = other.profiles.create!(name: "X", client_updated_at: Time.current)
    e = build(entry_type: "note", note: "hi", profile: other_profile)
    assert_not e.valid?
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bin/rails db:migrate && bin/rails test test/models/entry_test.rb`
Expected: FAIL (Entry class missing).

- [ ] **Step 4: Implement the model**

Create `app/models/entry.rb`:

```ruby
class Entry < ApplicationRecord
  include Syncable

  SYNC_ATTRIBUTES = %w[profile_id entry_type recorded_at symptom_type_id severity
                       temp_c medication_type_id dose reminder_at note].freeze

  ENTRY_TYPES = %w[symptom temp med note].freeze
  SEVERITIES = %w[mild moderate high severe].freeze

  belongs_to :profile
  belongs_to :symptom_type, optional: true
  belongs_to :medication_type, optional: true

  validates :entry_type, inclusion: { in: ENTRY_TYPES }
  validates :recorded_at, presence: true

  with_options if: -> { entry_type == "symptom" } do
    validates :symptom_type_id, presence: true
    validates :severity, inclusion: { in: SEVERITIES }
  end
  validates :temp_c, presence: true,
                     numericality: { greater_than: 30, less_than: 45 },
                     if: -> { entry_type == "temp" }
  validates :medication_type_id, presence: true, if: -> { entry_type == "med" }
  validates :note, presence: true, if: -> { entry_type == "note" }

  validate :references_stay_in_account

  private

  def references_stay_in_account
    { profile: profile, symptom_type: symptom_type, medication_type: medication_type }.each do |name, record|
      errors.add(name, "must belong to the same account") if record && record.account_id != account_id
    end
  end
end
```

Add to `app/models/account.rb` — `entries` must be declared **before** `profiles` so dependent deletes run children-first (reorder the existing lines to match):

```ruby
has_many :sessions, dependent: :delete_all
has_many :entries, dependent: :delete_all
has_many :profiles, dependent: :delete_all
has_many :symptom_types, dependent: :delete_all
has_many :medication_types, dependent: :delete_all
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bin/rails test test/models/entry_test.rb`
Expected: PASS (6 runs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Entry model with per-type validations"
```

---

### Task 7: Built-in catalogue seeding on account creation

**Files:**
- Create: `app/services/catalogue.rb`
- Modify: `app/models/account.rb`
- Test: `test/services/catalogue_test.rb`

- [ ] **Step 1: Write failing tests**

Create `test/services/catalogue_test.rb`:

```ruby
require "test_helper"

class CatalogueTest < ActiveSupport::TestCase
  test "new accounts get the built-in catalogues" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal 28, account.symptom_types.where(builtin: true).count
    assert_equal 5, account.medication_types.where(builtin: true).count
    assert_equal 8, account.symptom_types.where(group_name: "PFAPA").count
  end

  test "seeded rows are visible to an initial pull (server_version > 0)" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal 33, account.symptom_types.changed_since(0).count +
                     account.medication_types.changed_since(0).count
    assert_operator account.reload.sync_version, :>=, 33
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/services/catalogue_test.rb`
Expected: FAIL (no seeding happens).

- [ ] **Step 3: Implement the seeder**

Create `app/services/catalogue.rb` (catalogue ported verbatim from the prototype's `data.jsx`):

```ruby
# Built-in symptom and medication catalogues, copied into every new account
# so built-ins and custom items sync identically.
module Catalogue
  SYMPTOMS = [
    { icon: "fever",        label: "Fever",          group: "PFAPA" },
    { icon: "throat",       label: "Sore throat",    group: "PFAPA" },
    { icon: "ulcers",       label: "Mouth ulcers",   group: "PFAPA" },
    { icon: "glands",       label: "Swollen glands", group: "PFAPA" },
    { icon: "legpain",      label: "Leg pain",       group: "PFAPA" },
    { icon: "tummy",        label: "Stomachache",    group: "PFAPA" },
    { icon: "headache",     label: "Headache",       group: "PFAPA" },
    { icon: "nosebleed",    label: "Nosebleed",      group: "PFAPA" },
    { icon: "cough",        label: "Cough",          group: "Infection" },
    { icon: "runnynose",    label: "Runny nose",     group: "Infection" },
    { icon: "stuffynose",   label: "Stuffy nose",    group: "Infection" },
    { icon: "earpain",      label: "Ear pain",       group: "Infection" },
    { icon: "nausea",       label: "Nausea",         group: "Infection" },
    { icon: "vomiting",     label: "Vomiting",       group: "Infection" },
    { icon: "diarrhea",     label: "Diarrhea",       group: "Infection" },
    { icon: "constipation", label: "Constipation",   group: "Infection" },
    { icon: "cramps",       label: "Cramps",         group: "General" },
    { icon: "bloating",     label: "Bloating",       group: "General" },
    { icon: "chestpain",    label: "Chest pain",     group: "General" },
    { icon: "palpitations", label: "Palpitations",   group: "General" },
    { icon: "dizziness",    label: "Dizziness",      group: "General" },
    { icon: "jointpain",    label: "Joint pain",     group: "General" },
    { icon: "hotflashes",   label: "Hot flashes",    group: "General" },
    { icon: "rash",         label: "Rash",           group: "General" },
    { icon: "fatigue",      label: "Fatigue",        group: "General" },
    { icon: "sleepiness",   label: "Sleepiness",     group: "General" },
    { icon: "chills",       label: "Chills",         group: "General" },
    { icon: "appetite",     label: "Low appetite",   group: "General" }
  ].freeze

  MEDICATIONS = [
    { label: "Ibuprofen",    brand: "Nurofen", form: "syrup",  default_dose: "5 ml",
      strength: "100mg/5ml", color: "#F2802E", kind: "Pain / fever" },
    { label: "Paracetamol",  brand: "Calpol",  form: "syrup",  default_dose: "7.5 ml",
      strength: "120mg/5ml", color: "#FEAE2E", kind: "Pain / fever" },
    { label: "Prednisolone", brand: nil,       form: "tablet", default_dose: "15 mg",
      strength: "5mg",       color: "#958CBE", kind: "Steroid · flare" },
    { label: "Amoxicillin",  brand: nil,       form: "syrup",  default_dose: "5 ml",
      strength: "250mg/5ml", color: "#59586E", kind: "Antibiotic" },
    { label: "Vitamin D",    brand: nil,       form: "drops",  default_dose: "1 drop",
      strength: "400 IU",    color: "#606C83", kind: "Supplement" }
  ].freeze

  def self.seed!(account)
    now = Time.current
    SYMPTOMS.each do |s|
      account.symptom_types.create!(
        label: s[:label], icon: s[:icon], group_name: s[:group], builtin: true,
        client_updated_at: now, server_version: account.next_sync_version!
      )
    end
    MEDICATIONS.each do |m|
      account.medication_types.create!(
        m.slice(:label, :brand, :form, :strength, :default_dose, :color, :kind)
         .merge(builtin: true, client_updated_at: now,
                server_version: account.next_sync_version!)
      )
    end
  end
end
```

Add to `app/models/account.rb`, after the validations:

```ruby
after_create { Catalogue.seed!(self) }
```

- [ ] **Step 4: Run the full suite (seeding affects earlier tests)**

Run: `bin/rails test`
Expected: PASS — including all earlier model tests (they create accounts, which now seed 33 rows; none of them assert empty catalogues).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed built-in symptom and medication catalogues on signup"
```

---

### Task 8: API base controller + signup endpoint

**Files:**
- Create: `app/controllers/api/v1/base_controller.rb`, `app/controllers/api/v1/auth/registrations_controller.rb`
- Modify: `config/routes.rb`
- Test: `test/integration/api/signup_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/signup_test.rb`:

```ruby
require "test_helper"

class SignupTest < ActionDispatch::IntegrationTest
  test "signup creates account, seeds catalogues, returns token" do
    post "/api/v1/auth/signup",
         params: { email: "parent@example.com", password: "secret123", device_name: "iPhone" }
    assert_response :created
    assert json["token"].present?
    assert_equal "parent@example.com", json.dig("account", "email")
    assert_equal "c", json.dig("account", "settings", "temp_unit")
    account = Account.find(json.dig("account", "id"))
    assert_equal 28, account.symptom_types.count
  end

  test "signup with invalid email returns error envelope" do
    post "/api/v1/auth/signup", params: { email: "nope", password: "secret123" }
    assert_response :unprocessable_entity
    assert_equal "validation_failed", json.dig("error", "code")
    assert json.dig("error", "message").present?
  end

  test "duplicate signup rejected" do
    post "/api/v1/auth/signup", params: { email: "parent@example.com", password: "secret123" }
    post "/api/v1/auth/signup", params: { email: "parent@example.com", password: "secret123" }
    assert_response :unprocessable_entity
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/signup_test.rb`
Expected: FAIL (404, no route).

- [ ] **Step 3: Implement routes, base controller, registrations controller**

Replace `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      namespace :auth do
        post :signup, to: "registrations#create"
        post :signin, to: "sessions#create"
        delete :session, to: "sessions#destroy"
        post :apple, to: "apple#create"
        post :password_reset, to: "password_resets#create"
        post "password_reset/confirm", to: "password_resets#confirm"
      end
      resource :account, only: [:show, :update, :destroy]
      get "sync/pull", to: "sync#pull"
      post "sync/push", to: "sync#push"
    end
  end
end
```

(Sessions/apple/password-reset/account/sync controllers come in later tasks; unrouted-to-missing-controller errors only occur when those paths are hit.)

Create `app/controllers/api/v1/base_controller.rb`:

```ruby
class Api::V1::BaseController < ActionController::API
  before_action :authenticate!

  rescue_from ActiveRecord::RecordNotFound do
    render_error :not_found, "not_found", "Record not found"
  end
  rescue_from ActionController::ParameterMissing do |e|
    render_error :unprocessable_entity, "missing_parameter", e.message
  end

  private

  attr_reader :current_account, :current_session

  def authenticate!
    token = request.headers["Authorization"].to_s.delete_prefix("Bearer ").strip
    @current_session = token.present? ? Session.find_by_token(token) : nil
    return render_error(:unauthorized, "invalid_token", "Invalid or expired token") unless @current_session

    @current_session.touch(:last_used_at)
    @current_account = @current_session.account
  end

  def render_error(status, code, message)
    render json: { error: { code: code, message: message } }, status: status
  end

  def account_json(account)
    { id: account.id, email: account.email, settings: account.settings }
  end
end
```

Create `app/controllers/api/v1/auth/registrations_controller.rb`:

```ruby
class Api::V1::Auth::RegistrationsController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    account = Account.new(email: params[:email], password: params[:password])
    if account.save
      _session, token = Session.start!(account: account, device_name: params[:device_name])
      render json: { account: account_json(account), token: token }, status: :created
    else
      render_error :unprocessable_entity, "validation_failed",
                   account.errors.full_messages.to_sentence
    end
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/signup_test.rb`
Expected: PASS (3 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: API base controller with bearer auth and signup endpoint"
```

---

### Task 9: Signin and signout endpoints

**Files:**
- Create: `app/controllers/api/v1/auth/sessions_controller.rb`
- Test: `test/integration/api/signin_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/signin_test.rb`:

```ruby
require "test_helper"

class SigninTest < ActionDispatch::IntegrationTest
  setup do
    @account = Account.create!(email: "parent@example.com", password: "secret123")
  end

  test "signin with valid credentials returns a fresh token" do
    post "/api/v1/auth/signin",
         params: { email: "Parent@Example.com", password: "secret123", device_name: "iPad" }
    assert_response :success
    assert json["token"].present?
    assert_equal @account.id, json.dig("account", "id")
  end

  test "signin with bad password returns generic 401" do
    post "/api/v1/auth/signin", params: { email: "parent@example.com", password: "wrong" }
    assert_response :unauthorized
    assert_equal "invalid_credentials", json.dig("error", "code")
  end

  test "signin to unknown email returns generic 401" do
    post "/api/v1/auth/signin", params: { email: "nobody@example.com", password: "secret123" }
    assert_response :unauthorized
    assert_equal "invalid_credentials", json.dig("error", "code")
  end

  test "signout revokes only this device's token" do
    _s1, token1 = Session.start!(account: @account, device_name: "iPhone")
    _s2, token2 = Session.start!(account: @account, device_name: "iPad")
    delete "/api/v1/auth/session", headers: auth_headers(token1)
    assert_response :no_content
    get "/api/v1/account", headers: auth_headers(token1)
    assert_response :unauthorized
    get "/api/v1/account", headers: auth_headers(token2)
    assert_response :success
  end
end
```

(The signout test exercises `GET /api/v1/account` — a thin endpoint added here so auth is verifiable end-to-end; Task 11 expands accounts.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/signin_test.rb`
Expected: FAIL (controller missing).

- [ ] **Step 3: Implement**

Create `app/controllers/api/v1/auth/sessions_controller.rb`:

```ruby
class Api::V1::Auth::SessionsController < Api::V1::BaseController
  skip_before_action :authenticate!, only: :create

  def create
    account = Account.find_by(email: params[:email].to_s.strip.downcase)
    if account&.password_digest.present? && account.authenticate(params[:password].to_s)
      _session, token = Session.start!(account: account, device_name: params[:device_name])
      render json: { account: account_json(account), token: token }
    else
      render_error :unauthorized, "invalid_credentials", "Invalid email or password"
    end
  end

  def destroy
    current_session.destroy!
    head :no_content
  end
end
```

Create `app/controllers/api/v1/accounts_controller.rb` (show only for now):

```ruby
class Api::V1::AccountsController < Api::V1::BaseController
  def show
    render json: { account: account_json(current_account) }
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/signin_test.rb`
Expected: PASS (4 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: signin/signout endpoints and account show"
```

---

### Task 10: Sign in with Apple

**Files:**
- Create: `app/services/apple_token_verifier.rb`, `app/controllers/api/v1/auth/apple_controller.rb`
- Test: `test/integration/api/apple_signin_test.rb`

- [ ] **Step 1: Write failing request tests (JWKS mocked via a generated RSA key)**

Create `test/integration/api/apple_signin_test.rb`:

```ruby
require "test_helper"

class AppleSigninTest < ActionDispatch::IntegrationTest
  setup do
    @key = OpenSSL::PKey::RSA.generate(2048)
    @jwk = JWT::JWK.new(@key, kid: "test-key")
    jwks = { "keys" => [@jwk.export] }
    AppleTokenVerifier.stubs_jwks(jwks)
    ENV["APPLE_BUNDLE_ID"] = "com.symtrail.app"
  end

  teardown { AppleTokenVerifier.stubs_jwks(nil) }

  def apple_token(claims = {})
    payload = {
      iss: "https://appleid.apple.com", aud: "com.symtrail.app",
      exp: 5.minutes.from_now.to_i, sub: "apple-user-1",
      email: "parent@example.com", email_verified: true
    }.merge(claims)
    JWT.encode(payload, @key, "RS256", kid: "test-key")
  end

  test "first apple signin creates an account with seeded catalogues" do
    post "/api/v1/auth/apple", params: { identity_token: apple_token }
    assert_response :created
    account = Account.find(json.dig("account", "id"))
    assert_equal "apple-user-1", account.apple_user_id
    assert_equal 28, account.symptom_types.count
  end

  test "repeat apple signin finds the same account" do
    post "/api/v1/auth/apple", params: { identity_token: apple_token }
    first_id = json.dig("account", "id")
    post "/api/v1/auth/apple", params: { identity_token: apple_token(email: nil) }
    assert_response :success
    assert_equal first_id, json.dig("account", "id")
  end

  test "apple signin links to an existing email account when verified" do
    existing = Account.create!(email: "parent@example.com", password: "secret123")
    post "/api/v1/auth/apple", params: { identity_token: apple_token }
    assert_equal existing.id, json.dig("account", "id")
    assert_equal "apple-user-1", existing.reload.apple_user_id
  end

  test "rejects token with wrong audience" do
    post "/api/v1/auth/apple", params: { identity_token: apple_token(aud: "com.evil.app") }
    assert_response :unauthorized
    assert_equal "invalid_apple_token", json.dig("error", "code")
  end

  test "rejects garbage token" do
    post "/api/v1/auth/apple", params: { identity_token: "garbage" }
    assert_response :unauthorized
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/apple_signin_test.rb`
Expected: FAIL (verifier missing).

- [ ] **Step 3: Implement verifier and controller**

Create `app/services/apple_token_verifier.rb`:

```ruby
require "net/http"

# Verifies Sign in with Apple identity tokens against Apple's JWKS.
class AppleTokenVerifier
  JWKS_URL = "https://appleid.apple.com/auth/keys".freeze
  ISSUER = "https://appleid.apple.com".freeze
  Error = Class.new(StandardError)

  class << self
    # Test seam: assign a JWKS hash to bypass the network fetch.
    def stubs_jwks(jwks) = @stub_jwks = jwks

    def verify!(identity_token)
      payload, _header = JWT.decode(
        identity_token.to_s, nil, true,
        algorithms: ["RS256"],
        jwks: ->(_opts) { JWT::JWK::Set.new(jwks) },
        iss: ISSUER, verify_iss: true,
        aud: ENV.fetch("APPLE_BUNDLE_ID"), verify_aud: true
      )
      { apple_user_id: payload["sub"],
        email: payload["email"],
        email_verified: payload["email_verified"].to_s == "true" }
    rescue JWT::DecodeError => e
      raise Error, e.message
    end

    private

    def jwks
      @stub_jwks || Rails.cache.fetch("apple_jwks", expires_in: 12.hours) do
        JSON.parse(Net::HTTP.get(URI(JWKS_URL)))
      end
    end
  end
end
```

Create `app/controllers/api/v1/auth/apple_controller.rb`:

```ruby
class Api::V1::Auth::AppleController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    claims = AppleTokenVerifier.verify!(params.require(:identity_token))
    account = find_or_create_account(claims)
    status = account.previously_new_record? ? :created : :ok
    _session, token = Session.start!(account: account, device_name: params[:device_name])
    render json: { account: account_json(account), token: token }, status: status
  rescue AppleTokenVerifier::Error
    render_error :unauthorized, "invalid_apple_token", "Apple sign-in could not be verified"
  rescue ActiveRecord::RecordInvalid
    render_error :unprocessable_entity, "validation_failed",
                 "Could not create an account from this Apple ID"
  end

  private

  def find_or_create_account(claims)
    account = Account.find_by(apple_user_id: claims[:apple_user_id])
    return account if account

    if claims[:email].present? && claims[:email_verified]
      existing = Account.find_by(email: claims[:email].downcase)
      if existing
        existing.update!(apple_user_id: claims[:apple_user_id])
        return existing
      end
    end

    Account.create!(apple_user_id: claims[:apple_user_id], email: claims[:email])
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/apple_signin_test.rb`
Expected: PASS (5 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Sign in with Apple via JWKS-verified identity tokens"
```

---

### Task 11: Account settings update and account deletion

**Files:**
- Modify: `app/controllers/api/v1/accounts_controller.rb`
- Test: `test/integration/api/account_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/account_test.rb`:

```ruby
require "test_helper"

class AccountApiTest < ActionDispatch::IntegrationTest
  setup do
    @account, @token = api_signup
  end

  test "update settings merges temp_unit" do
    patch "/api/v1/account", params: { settings: { temp_unit: "f" } },
                             headers: auth_headers(@token)
    assert_response :success
    assert_equal "f", json.dig("account", "settings", "temp_unit")
    assert_equal "f", @account.reload.settings["temp_unit"]
  end

  test "rejects invalid temp_unit" do
    patch "/api/v1/account", params: { settings: { temp_unit: "kelvin" } },
                             headers: auth_headers(@token)
    assert_response :unprocessable_entity
  end

  test "account deletion removes all data" do
    profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    @account.entries.create!(profile: profile, entry_type: "note", note: "hi",
                             recorded_at: Time.current, client_updated_at: Time.current)
    delete "/api/v1/account", headers: auth_headers(@token)
    assert_response :no_content
    assert_nil Account.find_by(id: @account.id)
    assert_equal 0, Profile.where(account_id: @account.id).count
    assert_equal 0, Entry.where(account_id: @account.id).count
    assert_equal 0, Session.where(account_id: @account.id).count
  end

  test "requests without token are rejected" do
    get "/api/v1/account"
    assert_response :unauthorized
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/account_test.rb`
Expected: FAIL (no update/destroy actions).

- [ ] **Step 3: Implement**

Replace `app/controllers/api/v1/accounts_controller.rb`:

```ruby
class Api::V1::AccountsController < Api::V1::BaseController
  VALID_TEMP_UNITS = %w[c f].freeze

  def show
    render json: { account: account_json(current_account) }
  end

  def update
    settings = params.require(:settings).permit(:temp_unit).to_h
    if settings.key?("temp_unit") && !VALID_TEMP_UNITS.include?(settings["temp_unit"])
      return render_error :unprocessable_entity, "validation_failed", "temp_unit must be c or f"
    end

    current_account.update!(settings: current_account.settings.merge(settings))
    render json: { account: account_json(current_account) }
  end

  def destroy
    current_account.destroy!
    head :no_content
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/account_test.rb`
Expected: PASS (4 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: account settings update and App Store-required account deletion"
```

---

### Task 12: Password reset

**Files:**
- Create: `app/mailers/password_reset_mailer.rb`, `app/views/password_reset_mailer/reset.text.erb`, `app/controllers/api/v1/auth/password_resets_controller.rb`
- Modify: `app/models/account.rb`
- Test: `test/integration/api/password_reset_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/password_reset_test.rb`:

```ruby
require "test_helper"

class PasswordResetTest < ActionDispatch::IntegrationTest
  include ActionMailer::TestHelper # assert_emails + perform_enqueued_jobs

  setup do
    @account = Account.create!(email: "parent@example.com", password: "secret123")
  end

  # deliver_later only enqueues in tests; wrap email-sending requests in
  # perform_enqueued_jobs so deliveries is populated.
  def request_reset(email)
    perform_enqueued_jobs do
      post "/api/v1/auth/password_reset", params: { email: email }
    end
  end

  test "request sends an email containing a working token" do
    assert_emails 1 do
      request_reset("parent@example.com")
    end
    assert_response :accepted
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm",
         params: { token: token, password: "newsecret9" }
    assert_response :success
    assert @account.reload.authenticate("newsecret9")
  end

  test "request for unknown email still returns 202 (no enumeration)" do
    assert_emails 0 do
      request_reset("nobody@example.com")
    end
    assert_response :accepted
  end

  test "confirm with bad token fails" do
    post "/api/v1/auth/password_reset/confirm",
         params: { token: "bogus", password: "newsecret9" }
    assert_response :unauthorized
  end

  test "token is single-use (invalidated by the password change)" do
    request_reset("parent@example.com")
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "newsecret9" }
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "evilpass99" }
    assert_response :unauthorized
  end

  test "confirm revokes existing sessions" do
    _s, old_token = Session.start!(account: @account)
    request_reset("parent@example.com")
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "newsecret9" }
    get "/api/v1/account", headers: auth_headers(old_token)
    assert_response :unauthorized
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/password_reset_test.rb`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `app/models/account.rb` (after `has_secure_password`):

```ruby
generates_token_for :password_reset, expires_in: 30.minutes do
  password_salt&.last(10)
end
```

Create `app/mailers/password_reset_mailer.rb`:

```ruby
class PasswordResetMailer < ApplicationMailer
  def reset(account, token)
    @token = token
    mail to: account.email, subject: "Reset your Symtrail password"
  end
end
```

Create `app/views/password_reset_mailer/reset.text.erb`:

```erb
Someone requested a password reset for your Symtrail account.

Open the Symtrail app, choose "I have a reset code", and paste this code.
It expires in 30 minutes. Reset token: <%= @token %>

If you didn't request this, you can ignore this email.
```

Create `app/controllers/api/v1/auth/password_resets_controller.rb`:

```ruby
class Api::V1::Auth::PasswordResetsController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    account = Account.find_by(email: params[:email].to_s.strip.downcase)
    if account&.password_digest.present?
      token = account.generate_token_for(:password_reset)
      PasswordResetMailer.reset(account, token).deliver_later
    end
    head :accepted
  end

  def confirm
    account = Account.find_by_token_for(:password_reset, params[:token].to_s)
    return render_error(:unauthorized, "invalid_reset_token", "Invalid or expired reset token") unless account

    if account.update(password: params[:password])
      account.sessions.delete_all
      head :ok
    else
      render_error :unprocessable_entity, "validation_failed",
                   account.errors.full_messages.to_sentence
    end
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/password_reset_test.rb`
Expected: PASS (5 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: email-based password reset with single-use expiring tokens"
```

---

### Task 13: Sync pull

**Files:**
- Create: `app/services/sync/pull.rb`, `app/controllers/api/v1/sync_controller.rb`
- Test: `test/integration/api/sync_pull_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/sync_pull_test.rb`:

```ruby
require "test_helper"

class SyncPullTest < ActionDispatch::IntegrationTest
  setup do
    @account, @token = api_signup
  end

  test "initial pull (since=0) returns seeded catalogues and cursor" do
    get "/api/v1/sync/pull", params: { since: 0 }, headers: auth_headers(@token)
    assert_response :success
    assert_equal 28, json.dig("changes", "symptom_types", "updated").size
    assert_equal 5, json.dig("changes", "medication_types", "updated").size
    assert_equal [], json.dig("changes", "profiles", "updated")
    assert_equal @account.reload.sync_version, json["cursor"]
  end

  test "incremental pull returns only rows past the cursor" do
    get "/api/v1/sync/pull", params: { since: 0 }, headers: auth_headers(@token)
    cursor = json["cursor"]

    profile = @account.profiles.new(name: "Leo", client_updated_at: Time.current)
    profile.server_version = @account.next_sync_version!
    profile.save!

    get "/api/v1/sync/pull", params: { since: cursor }, headers: auth_headers(@token)
    assert_equal [profile.id], json.dig("changes", "profiles", "updated").map { |r| r["id"] }
    assert_equal [], json.dig("changes", "symptom_types", "updated")
  end

  test "tombstoned rows appear as deleted ids" do
    profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    cursor = @account.reload.sync_version
    profile.soft_delete!
    get "/api/v1/sync/pull", params: { since: cursor }, headers: auth_headers(@token)
    assert_equal [profile.id], json.dig("changes", "profiles", "deleted")
    assert_equal [], json.dig("changes", "profiles", "updated")
  end

  test "does not leak other accounts' data" do
    other, _t = api_signup(email: "other@example.com")
    other.profiles.create!(name: "Stranger", client_updated_at: Time.current,
                           server_version: other.next_sync_version!)
    get "/api/v1/sync/pull", params: { since: 0 }, headers: auth_headers(@token)
    assert_equal [], json.dig("changes", "profiles", "updated")
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/sync_pull_test.rb`
Expected: FAIL (controller missing).

- [ ] **Step 3: Implement**

Create `app/services/sync/pull.rb`:

```ruby
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
```

Create `app/controllers/api/v1/sync_controller.rb`:

```ruby
class Api::V1::SyncController < Api::V1::BaseController
  def pull
    render json: Sync::Pull.new(current_account, since: params.fetch(:since, 0)).call
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/sync_pull_test.rb`
Expected: PASS (4 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sync pull endpoint with version cursor and tombstones"
```

---

### Task 14: Sync push with LWW conflict resolution

**Files:**
- Create: `app/services/sync/push.rb`
- Modify: `app/controllers/api/v1/sync_controller.rb`
- Test: `test/integration/api/sync_push_test.rb`

- [ ] **Step 1: Write failing request tests**

Create `test/integration/api/sync_push_test.rb`:

```ruby
require "test_helper"

class SyncPushTest < ActionDispatch::IntegrationTest
  setup do
    @account, @token = api_signup
    @profile_id = SecureRandom.uuid
  end

  def push(changes)
    post "/api/v1/sync/push", params: { changes: changes },
                              headers: auth_headers(@token), as: :json
  end

  def profile_record(attrs = {})
    { "id" => @profile_id, "name" => "Leo", "color" => "#FEAE2E",
      "client_updated_at" => "2026-06-10T08:00:00Z" }.merge(attrs)
  end

  test "creates records in dependency order within one push" do
    entry_id = SecureRandom.uuid
    push({ "profiles" => { "updated" => [profile_record] },
           "entries" => { "updated" => [{
             "id" => entry_id, "profile_id" => @profile_id, "entry_type" => "note",
             "note" => "first night", "recorded_at" => "2026-06-10T07:50:00Z",
             "client_updated_at" => "2026-06-10T08:00:00Z" }] } })
    assert_response :success
    assert_equal [@profile_id, entry_id].sort, json["accepted"].sort
    assert_equal "Leo", Profile.find(@profile_id).name
    assert_equal "first night", Entry.find(entry_id).note
  end

  test "newer client_updated_at wins (LWW)" do
    push({ "profiles" => { "updated" => [profile_record] } })
    push({ "profiles" => { "updated" => [profile_record(
      "name" => "Leonardo", "client_updated_at" => "2026-06-10T09:00:00Z")] } })
    assert_equal [@profile_id], json["accepted"]
    assert_equal "Leonardo", Profile.find(@profile_id).name
  end

  test "older client_updated_at is rejected as stale" do
    push({ "profiles" => { "updated" => [profile_record] } })
    push({ "profiles" => { "updated" => [profile_record(
      "name" => "Old Phone", "client_updated_at" => "2026-06-10T07:00:00Z")] } })
    assert_equal [{ "id" => @profile_id, "reason" => "stale" }], json["rejected"]
    assert_equal "Leo", Profile.find(@profile_id).name
  end

  test "identical client_updated_at is an accepted no-op (idempotent retry)" do
    push({ "profiles" => { "updated" => [profile_record] } })
    version = Profile.find(@profile_id).server_version
    push({ "profiles" => { "updated" => [profile_record] } })
    assert_equal [@profile_id], json["accepted"]
    assert_equal version, Profile.find(@profile_id).server_version
  end

  test "invalid record rejected individually, rest of batch applies" do
    push({ "profiles" => { "updated" => [
      profile_record,
      { "id" => SecureRandom.uuid, "name" => "", "client_updated_at" => "2026-06-10T08:00:00Z" }
    ] } })
    assert_equal [@profile_id], json["accepted"]
    assert_equal 1, json["rejected"].size
    assert_equal "invalid", json["rejected"].first["reason"]
  end

  test "deletes tombstone records" do
    push({ "profiles" => { "updated" => [profile_record] } })
    push({ "profiles" => { "deleted" => [@profile_id] } })
    assert_equal [@profile_id], json["accepted"]
    assert Profile.find(@profile_id).deleted_at.present?
  end

  test "deleting an unknown id is accepted (idempotent)" do
    ghost = SecureRandom.uuid
    push({ "profiles" => { "deleted" => [ghost] } })
    assert_equal [ghost], json["accepted"]
  end

  test "cannot hijack a record id owned by another account" do
    other, other_token = api_signup(email: "other@example.com")
    theirs = other.profiles.create!(name: "Theirs", client_updated_at: Time.current)
    push({ "profiles" => { "updated" => [profile_record(
      "id" => theirs.id, "name" => "Hijacked", "client_updated_at" => "2030-01-01T00:00:00Z")] } })
    assert_equal "invalid", json["rejected"].first["reason"]
    assert_equal "Theirs", theirs.reload.name
  end

  test "record without parseable client_updated_at is rejected" do
    push({ "profiles" => { "updated" => [profile_record("client_updated_at" => "not a date")] } })
    assert_equal "invalid", json["rejected"].first["reason"]
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/sync_push_test.rb`
Expected: FAIL (no push action).

- [ ] **Step 3: Implement**

Create `app/services/sync/push.rb`:

```ruby
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
```

Add to `app/controllers/api/v1/sync_controller.rb`:

```ruby
def push
  changes = params.require(:changes).to_unsafe_h
  render json: Sync::Push.new(current_account, changes: changes).call
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/sync_push_test.rb`
Expected: PASS (9 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sync push with per-record LWW and individual rejection"
```

---

### Task 15: Two-device convergence integration test

**Files:**
- Test: `test/integration/api/sync_convergence_test.rb`

- [ ] **Step 1: Write the convergence test (should pass against Tasks 13–14; it is the spec's priority scenario and guards regressions)**

Create `test/integration/api/sync_convergence_test.rb`:

```ruby
require "test_helper"

# Simulates two phones sharing one family account: push from A, pull on B,
# edit on B, delete on A, and verify both converge to identical state.
class SyncConvergenceTest < ActionDispatch::IntegrationTest
  setup do
    @account, _ = api_signup
    _sa, @token_a = Session.start!(account: @account, device_name: "Phone A")
    _sb, @token_b = Session.start!(account: @account, device_name: "Phone B")
    @cursor_a = 0
    @cursor_b = 0
  end

  def push(token, changes)
    post "/api/v1/sync/push", params: { changes: changes },
                              headers: auth_headers(token), as: :json
    json
  end

  def pull(token, since)
    get "/api/v1/sync/pull", params: { since: since }, headers: auth_headers(token)
    json
  end

  test "devices converge through push/pull cycles" do
    profile_id = SecureRandom.uuid
    entry_id = SecureRandom.uuid

    # Device A logs a profile + temp entry offline, then syncs.
    push(@token_a, {
      "profiles" => { "updated" => [{ "id" => profile_id, "name" => "Leo",
        "client_updated_at" => "2026-06-10T08:00:00Z" }] },
      "entries" => { "updated" => [{ "id" => entry_id, "profile_id" => profile_id,
        "entry_type" => "temp", "temp_c" => 38.5, "recorded_at" => "2026-06-10T07:45:00Z",
        "client_updated_at" => "2026-06-10T08:00:00Z" }] }
    })
    result = pull(@token_a, @cursor_a)
    @cursor_a = result["cursor"]

    # Device B's first pull sees everything, including seeded catalogues.
    result = pull(@token_b, @cursor_b)
    @cursor_b = result["cursor"]
    assert_equal ["Leo"], result.dig("changes", "profiles", "updated").map { |p| p["name"] }
    assert_equal 28, result.dig("changes", "symptom_types", "updated").size

    # Device B corrects the temperature; device A picks it up incrementally.
    push(@token_b, { "entries" => { "updated" => [{ "id" => entry_id,
      "profile_id" => profile_id, "entry_type" => "temp", "temp_c" => 38.9,
      "recorded_at" => "2026-06-10T07:45:00Z",
      "client_updated_at" => "2026-06-10T08:30:00Z" }] } })
    result = pull(@token_a, @cursor_a)
    @cursor_a = result["cursor"]
    assert_equal [["#{entry_id}", "38.9"]],
                 result.dig("changes", "entries", "updated").map { |e| [e["id"], e["temp_c"].to_s] }

    # Device A deletes the entry; device B sees the tombstone.
    push(@token_a, { "entries" => { "deleted" => [entry_id] } })
    result = pull(@token_b, @cursor_b)
    assert_includes result.dig("changes", "entries", "deleted"), entry_id

    # Both devices are now fully caught up: empty incremental pulls.
    @cursor_b = result["cursor"]
    result = pull(@token_a, @cursor_a)
    @cursor_a = result["cursor"]
    result_a = pull(@token_a, @cursor_a)
    result_b = pull(@token_b, @cursor_b)
    [result_a, result_b].each do |r|
      r["changes"].each_value do |tbl|
        assert_equal [], tbl["updated"]
        assert_equal [], tbl["deleted"]
      end
    end
  end
end
```

- [ ] **Step 2: Run the test**

Run: `bin/rails test test/integration/api/sync_convergence_test.rb`
Expected: PASS. If it fails, fix the underlying sync code (Tasks 13–14), not the test.

- [ ] **Step 3: Run the full suite**

Run: `bin/rails test`
Expected: PASS, no failures.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: two-device sync convergence scenario"
```

---

### Task 16: Tombstone purge job

**Files:**
- Create: `app/jobs/purge_tombstones_job.rb`
- Modify: `config/recurring.yml`
- Test: `test/jobs/purge_tombstones_job_test.rb`

- [ ] **Step 1: Write failing tests**

Create `test/jobs/purge_tombstones_job_test.rb`:

```ruby
require "test_helper"

class PurgeTombstonesJobTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
    @profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
  end

  test "purges tombstones older than 90 days, keeps fresh ones" do
    old_entry = @account.entries.create!(profile: @profile, entry_type: "note", note: "x",
                                         recorded_at: Time.current, client_updated_at: Time.current)
    fresh_entry = @account.entries.create!(profile: @profile, entry_type: "note", note: "y",
                                           recorded_at: Time.current, client_updated_at: Time.current)
    old_entry.soft_delete!
    fresh_entry.soft_delete!
    old_entry.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert_nil Entry.find_by(id: old_entry.id)
    assert Entry.find_by(id: fresh_entry.id).present?
  end

  test "keeps tombstoned catalogue types still referenced by entries" do
    symptom = @account.symptom_types.create!(label: "Custom ache", client_updated_at: Time.current)
    @account.entries.create!(profile: @profile, entry_type: "symptom", symptom_type: symptom,
                             severity: "mild", recorded_at: Time.current,
                             client_updated_at: Time.current)
    symptom.soft_delete!
    symptom.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert SymptomType.find_by(id: symptom.id).present?
  end

  test "keeps tombstoned profiles still referenced by entries" do
    @account.entries.create!(profile: @profile, entry_type: "note", note: "x",
                             recorded_at: Time.current, client_updated_at: Time.current)
    @profile.soft_delete!
    @profile.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert Profile.find_by(id: @profile.id).present?
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/jobs/purge_tombstones_job_test.rb`
Expected: FAIL (job missing).

- [ ] **Step 3: Implement the job**

Create `app/jobs/purge_tombstones_job.rb`:

```ruby
# Hard-deletes tombstones older than the retention window. Rows still
# referenced by entries are kept (harmless: they stay invisible to pulls
# past the cursor; devices offline > 90 days must full re-pull anyway).
class PurgeTombstonesJob < ApplicationJob
  RETENTION = 90.days

  def perform
    cutoff = RETENTION.ago
    Entry.where(deleted_at: ...cutoff).delete_all
    Profile.where(deleted_at: ...cutoff)
           .where.not(id: Entry.select(:profile_id)).delete_all
    SymptomType.where(deleted_at: ...cutoff)
               .where.not(id: Entry.where.not(symptom_type_id: nil).select(:symptom_type_id))
               .delete_all
    MedicationType.where(deleted_at: ...cutoff)
                  .where.not(id: Entry.where.not(medication_type_id: nil).select(:medication_type_id))
                  .delete_all
  end
end
```

Add to `config/recurring.yml` under the `production:` key (create the key if the file only has examples):

```yaml
production:
  purge_tombstones:
    class: PurgeTombstonesJob
    queue: default
    schedule: every day at 4am
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/jobs/purge_tombstones_job_test.rb`
Expected: PASS (3 runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: recurring tombstone purge with reference guards"
```

---

### Task 17: Rate limiting (rack-attack)

**Files:**
- Create: `config/initializers/rack_attack.rb`
- Test: `test/integration/api/rate_limit_test.rb`

- [ ] **Step 1: Write failing test**

Create `test/integration/api/rate_limit_test.rb`:

```ruby
require "test_helper"

class RateLimitTest < ActionDispatch::IntegrationTest
  setup do
    Rack::Attack.enabled = true
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
  end

  teardown { Rack::Attack.enabled = false }

  test "throttles repeated auth attempts from one IP" do
    11.times do
      post "/api/v1/auth/signin", params: { email: "x@example.com", password: "wrong" }
    end
    assert_response :too_many_requests
  end

  test "does not throttle sync traffic" do
    _account, token = api_signup
    15.times { get "/api/v1/sync/pull", params: { since: 0 }, headers: auth_headers(token) }
    assert_response :success
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bin/rails test test/integration/api/rate_limit_test.rb`
Expected: FAIL (no throttling; possibly NameError until initializer exists).

- [ ] **Step 3: Implement the initializer**

Create `config/initializers/rack_attack.rb`:

```ruby
class Rack::Attack
  # Brute-force guard on all auth endpoints (signin, signup, apple, reset).
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/auth") && req.post?
  end
end

Rack::Attack.enabled = !Rails.env.test?
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bin/rails test test/integration/api/rate_limit_test.rb`
Expected: PASS (2 runs). Note: the signup inside the second test happens while enabled — it performs only 1 auth POST, well under the limit.

- [ ] **Step 5: Run the full suite**

Run: `bin/rails test`
Expected: PASS (rack-attack disabled outside these tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: rate-limit auth endpoints with rack-attack"
```

---

### Task 18: Litestream backups + production/deploy configuration

**Files:**
- Modify: `Gemfile`, `config/puma.rb`, `config/database.yml`
- Create: `config/initializers/litestream.rb`, `fly.toml.example`

- [ ] **Step 1: Add and configure litestream**

Run: `bundle add litestream`

Create `config/initializers/litestream.rb`:

```ruby
# Continuous SQLite replication to S3-compatible storage. No-op unless the
# bucket env vars are present (i.e., disabled in dev/test by default).
Rails.application.configure do
  config.litestream.replica_bucket = ENV["LITESTREAM_REPLICA_BUCKET"]
  config.litestream.replica_key_id = ENV["LITESTREAM_ACCESS_KEY_ID"]
  config.litestream.replica_access_key = ENV["LITESTREAM_SECRET_ACCESS_KEY"]
end
```

Add to `config/puma.rb`, at the end:

```ruby
# Run Litestream replication inside the web process in production.
plugin :litestream if ENV["LITESTREAM_REPLICA_BUCKET"].present?
```

- [ ] **Step 2: Point production databases at the mounted volume**

In `config/database.yml`, the production section (Rails 8 generates primary/cache/queue databases) — set each `database:` path to live under a volume-mounted directory, e.g.:

```yaml
production:
  primary:
    <<: *default
    database: <%= ENV.fetch("SQLITE_DIR", "storage") %>/production.sqlite3
  cache:
    <<: *default
    database: <%= ENV.fetch("SQLITE_DIR", "storage") %>/production_cache.sqlite3
    migrations_paths: db/cache_migrate
  queue:
    <<: *default
    database: <%= ENV.fetch("SQLITE_DIR", "storage") %>/production_queue.sqlite3
    migrations_paths: db/queue_migrate
```

(Keep whatever keys Rails generated; only the `database:` values change. WAL mode is the Rails 8 SQLite default — no extra config needed.)

- [ ] **Step 3: Add a deploy config example**

Create `fly.toml.example`:

```toml
app = "symtrail"
primary_region = "ams"

[build]

[env]
  SQLITE_DIR = "/data"
  SOLID_QUEUE_IN_PUMA = "true"
  APPLE_BUNDLE_ID = "com.symtrail.app"

[mounts]
  source = "symtrail_data"
  destination = "/data"

[http_service]
  internal_port = 3000
  force_https = true
  min_machines_running = 1

[checks.health]
  port = 3000
  type = "http"
  path = "/up"
```

(Secrets — `RAILS_MASTER_KEY`, `LITESTREAM_*`, SMTP credentials for the mail provider — are set via `fly secrets set`, never committed.)

- [ ] **Step 4: Verify nothing broke**

Run: `bin/rails test && RAILS_ENV=production bin/rails runner "puts :boots" 2>&1 | tail -1`
Expected: full suite PASS. The production boot check should print `boots` (a missing-credentials error is acceptable if `config/credentials.yml.enc` requires a key — note it and move on; CI/dev machines don't have production secrets).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: litestream backups and production SQLite/deploy configuration"
```

---

### Task 19: Final verification

- [ ] **Step 1: Full suite + smoke the API manually**

Run: `bin/rails test`
Expected: PASS, 0 failures.

Run a manual smoke test:

```bash
bin/rails server -p 3111 &
sleep 3
curl -s -X POST localhost:3111/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"secret123"}' | head -c 300
echo
TOKEN=$(curl -s -X POST localhost:3111/api/v1/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"secret123"}' | ruby -rjson -e 'puts JSON.parse(STDIN.read)["token"]')
curl -s "localhost:3111/api/v1/sync/pull?since=0" -H "Authorization: Bearer $TOKEN" | head -c 300
kill %1
```

Expected: signup returns `{"account":...,"token":...}`; pull returns 28 symptom types in `changes.symptom_types.updated`.

- [ ] **Step 2: Update the spec status and commit**

Edit `docs/superpowers/specs/2026-06-10-rails-backend-sync-api-design.md`: change `**Status:** Approved for planning` to `**Status:** Implemented`.

```bash
git add -A
git commit -m "docs: mark backend spec implemented"
```
