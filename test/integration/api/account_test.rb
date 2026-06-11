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
