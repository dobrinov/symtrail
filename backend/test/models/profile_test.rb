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
