require "test_helper"

class PasswordResetTest < ActionDispatch::IntegrationTest
  include ActionMailer::TestHelper # assert_emails + perform_enqueued_jobs

  setup do
    @account = Account.create!(email: "parent@example.com", password: "secret123")
  end

  # deliver_later only enqueues in tests; wrap email-sending requests in
  # perform_enqueued_jobs so deliveries is populated.
  def request_reset(email)
    perform_enqueued_jobs do
      post "/api/v1/auth/password_reset", params: { email: email }
    end
  end

  test "request sends an email containing a working token" do
    assert_emails 1 do
      request_reset("parent@example.com")
    end
    assert_response :accepted
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm",
         params: { token: token, password: "newsecret9" }
    assert_response :success
    assert @account.reload.authenticate("newsecret9")
  end

  test "request for unknown email still returns 202 (no enumeration)" do
    assert_emails 0 do
      request_reset("nobody@example.com")
    end
    assert_response :accepted
  end

  test "confirm with bad token fails" do
    post "/api/v1/auth/password_reset/confirm",
         params: { token: "bogus", password: "newsecret9" }
    assert_response :unauthorized
  end

  test "token is single-use (invalidated by the password change)" do
    request_reset("parent@example.com")
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "newsecret9" }
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "evilpass99" }
    assert_response :unauthorized
  end

  test "confirm revokes existing sessions" do
    _s, old_token = Session.start!(account: @account)
    request_reset("parent@example.com")
    token = ActionMailer::Base.deliveries.last.body.to_s[/token: (\S+)/, 1]
    post "/api/v1/auth/password_reset/confirm", params: { token: token, password: "newsecret9" }
    get "/api/v1/account", headers: auth_headers(old_token)
    assert_response :unauthorized
  end
end
