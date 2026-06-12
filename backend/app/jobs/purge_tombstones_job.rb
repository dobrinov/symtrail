# Hard-deletes tombstones older than the retention window. Rows still
# referenced by entries are kept (harmless: they stay invisible to pulls
# past the cursor; devices offline > 90 days must full re-pull anyway).
class PurgeTombstonesJob < ApplicationJob
  RETENTION = 90.days

  def perform
    cutoff = RETENTION.ago
    Entry.where(deleted_at: ...cutoff).delete_all
    Profile.where(deleted_at: ...cutoff)
           .where.not(id: Entry.select(:profile_id)).delete_all
    SymptomType.where(deleted_at: ...cutoff)
               .where.not(id: Entry.where.not(symptom_type_id: nil).select(:symptom_type_id))
               .delete_all
    MedicationType.where(deleted_at: ...cutoff)
                  .where.not(id: Entry.where.not(medication_type_id: nil).select(:medication_type_id))
                  .delete_all
  end
end
