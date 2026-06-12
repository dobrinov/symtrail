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
        jwks: ->(opts) { JWT::JWK::Set.new(jwks(force: opts[:invalidate])) },
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

    # force: refetch on unknown kid so Apple key rotation doesn't 401
    # users until the cache expires.
    def jwks(force: false)
      @stub_jwks || Rails.cache.fetch("apple_jwks", expires_in: 12.hours, force: force) do
        JSON.parse(Net::HTTP.get(URI(JWKS_URL)))
      end
    end
  end
end
