require "test_helper"

class PurgeTombstonesJobTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(email: "a@example.com", password: "secret123")
    @profile = @account.profiles.create!(name: "Leo", client_updated_at: Time.current)
  end

  test "purges tombstones older than 90 days, keeps fresh ones" do
    old_entry = @account.entries.create!(profile: @profile, entry_type: "note", note: "x",
                                         recorded_at: Time.current, client_updated_at: Time.current)
    fresh_entry = @account.entries.create!(profile: @profile, entry_type: "note", note: "y",
                                           recorded_at: Time.current, client_updated_at: Time.current)
    old_entry.soft_delete!
    fresh_entry.soft_delete!
    old_entry.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert_nil Entry.find_by(id: old_entry.id)
    assert Entry.find_by(id: fresh_entry.id).present?
  end

  test "keeps tombstoned catalogue types still referenced by entries" do
    symptom = @account.symptom_types.create!(label: "Custom ache", client_updated_at: Time.current)
    @account.entries.create!(profile: @profile, entry_type: "symptom", symptom_type: symptom,
                             severity: "mild", recorded_at: Time.current,
                             client_updated_at: Time.current)
    symptom.soft_delete!
    symptom.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert SymptomType.find_by(id: symptom.id).present?
  end

  test "keeps tombstoned profiles still referenced by entries" do
    @account.entries.create!(profile: @profile, entry_type: "note", note: "x",
                             recorded_at: Time.current, client_updated_at: Time.current)
    @profile.soft_delete!
    @profile.update_column(:deleted_at, 91.days.ago)

    PurgeTombstonesJob.perform_now
    assert Profile.find_by(id: @profile.id).present?
  end
end
