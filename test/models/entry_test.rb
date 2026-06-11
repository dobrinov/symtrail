require "test_helper"

class EntryTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
    @profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
    @symptom = @account.symptom_types.create!(label: "Sore throat", client_updated_at: Time.current)
    @med = @account.medication_types.create!(label: "Ibuprofen", client_updated_at: Time.current)
  end

  def build(attrs)
    @account.entries.new({ profile: @profile, recorded_at: Time.current,
                           client_updated_at: Time.current }.merge(attrs))
  end

  test "symptom entry requires symptom_type and valid severity" do
    assert_not build(entry_type: "symptom").valid?
    assert_not build(entry_type: "symptom", symptom_type: @symptom, severity: "extreme").valid?
    assert build(entry_type: "symptom", symptom_type: @symptom, severity: "mild").valid?
  end

  test "temp entry requires plausible temp_c" do
    assert_not build(entry_type: "temp").valid?
    assert_not build(entry_type: "temp", temp_c: 99).valid?
    assert build(entry_type: "temp", temp_c: 38.5).valid?
  end

  test "med entry requires medication_type" do
    assert_not build(entry_type: "med").valid?
    assert build(entry_type: "med", medication_type: @med, dose: "5 ml").valid?
  end

  test "note entry requires note text" do
    assert_not build(entry_type: "note").valid?
    assert build(entry_type: "note", note: "Off his dinner").valid?
  end

  test "rejects unknown entry types" do
    assert_not build(entry_type: "weight").valid?
  end

  test "rejects references to another account's records" do
    other = Account.create!(email: "b@example.com", password: "secret123")
    other_profile = other.profiles.create!(name: "X", client_updated_at: Time.current)
    e = build(entry_type: "note", note: "hi", profile: other_profile)
    assert_not e.valid?

    other_symptom = other.symptom_types.create!(label: "Theirs", client_updated_at: Time.current)
    e = build(entry_type: "symptom", symptom_type: other_symptom, severity: "mild")
    assert_not e.valid?

    other_med = other.medication_types.create!(label: "Theirs", client_updated_at: Time.current)
    e = build(entry_type: "med", medication_type: other_med)
    assert_not e.valid?
  end
end
