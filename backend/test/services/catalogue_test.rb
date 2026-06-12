require "test_helper"

class CatalogueTest < ActiveSupport::TestCase
  test "new accounts get the built-in catalogues" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal 28, account.symptom_types.where(builtin: true).count
    assert_equal 5, account.medication_types.where(builtin: true).count
    assert_equal 8, account.symptom_types.where(group_name: "PFAPA").count
  end

  test "seeded rows are visible to an initial pull (server_version > 0)" do
    account = Account.create!(email: "a@example.com", password: "secret123")
    assert_equal 33, account.symptom_types.changed_since(0).count +
                     account.medication_types.changed_since(0).count
    assert_operator account.reload.sync_version, :>=, 33
  end
end
