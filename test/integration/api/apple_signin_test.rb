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

  test "linking revokes the email account's existing sessions" do
    existing = Account.create!(email: "parent@example.com", password: "secret123")
    _s, old_token = Session.start!(account: existing, device_name: "old phone")
    post "/api/v1/auth/apple", params: { identity_token: apple_token }
    assert_response :ok
    get "/api/v1/account", headers: auth_headers(old_token)
    assert_response :unauthorized
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
