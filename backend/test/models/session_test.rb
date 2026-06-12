require "test_helper"

class SessionTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
  end

  test "start! returns session and raw token, stores only the digest" do
    session, raw = Session.start!(account: @account, device_name: "iPhone")
    assert session.persisted?
    assert raw.length >= 32
    assert_not_equal raw, session.token_digest
    assert_equal session, Session.find_by_token(raw)
  end

  test "find_by_token returns nil for unknown token" do
    assert_nil Session.find_by_token("nonsense")
  end
end
