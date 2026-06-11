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
