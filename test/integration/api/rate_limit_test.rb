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
