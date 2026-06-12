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

  test "malformed payload shapes are rejected without a 500" do
    push({ "profiles" => { "updated" => [42] } })
    assert_response :success
    assert_equal "invalid", json["rejected"].first["reason"]

    push({ "profiles" => { "updated" => { "id" => "x" } } })
    assert_response :success
    assert_equal({ "accepted" => [], "rejected" => [] }, json)

    push({ "profiles" => { "deleted" => [{ "x" => 1 }] } })
    assert_response :success
    assert_equal "invalid", json["rejected"].first["reason"]

    push("garbage")
    assert_response :unprocessable_entity
    assert_equal "validation_failed", json.dig("error", "code")
  end
end
