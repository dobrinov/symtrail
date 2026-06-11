ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

module ApiTestHelpers
  def api_signup(email: "parent@example.com", password: "secret123")
    post "/api/v1/auth/signup", params: { email: email, password: password }
    body = JSON.parse(response.body)
    [Account.find(body.dig("account", "id")), body["token"]]
  end

  def auth_headers(token)
    { "Authorization" => "Bearer #{token}" }
  end

  def json
    JSON.parse(response.body)
  end
end

class ActionDispatch::IntegrationTest
  include ApiTestHelpers
end
