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
