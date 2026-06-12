require "test_helper"

class AccountTest < ActiveSupport::TestCase
  test "valid with email and password" do
    account = Account.new(email: "A@Example.com ", password: "secret123")
    assert account.valid?
    assert account.save
    assert_equal "a@example.com", account.email
  end

  test "requires password on create unless apple account" do
    assert_not Account.new(email: "a@example.com").valid?
    assert Account.new(email: "a@example.com", apple_user_id: "apple-123").valid?
  end

  test "rejects short passwords" do
    assert_not Account.new(email: "a@example.com", password: "short").valid?
  end

  test "rejects duplicate emails" do
    Account.create!(email: "a@example.com", password: "secret123")
    assert_not Account.new(email: "a@example.com", password: "secret123").valid?
  end

  test "next_sync_version! increments atomically and returns the new value" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    v1 = account.next_sync_version!
    v2 = account.next_sync_version!
    assert_equal v1 + 1, v2
    assert_equal v2, account.reload.sync_version
  end

  test "default settings" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal "c", account.settings["temp_unit"]
  end
end
