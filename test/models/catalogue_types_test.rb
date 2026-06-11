require "test_helper"

class CatalogueTypesTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
  end

  test "symptom type requires label" do
    assert_not @account.symptom_types.new(client_updated_at: Time.current).valid?
    assert @account.symptom_types.new(label: "Fever", icon: "fever", group_name: "PFAPA",
                                      client_updated_at: Time.current).valid?
  end

  test "medication type requires label" do
    assert_not @account.medication_types.new(client_updated_at: Time.current).valid?
    assert @account.medication_types.new(label: "Ibuprofen", form: "syrup",
                                         client_updated_at: Time.current).valid?
  end

  test "both are syncable" do
    s = @account.symptom_types.create!(label: "Fever", client_updated_at: Time.current)
    m = @account.medication_types.create!(label: "Ibuprofen", client_updated_at: Time.current)
    assert_match(/\A[0-9a-f-]{36}\z/, s.id)
    assert_includes m.sync_json.keys, "default_dose"
  end
end
