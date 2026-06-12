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
