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
