class Api::V1::SyncController < Api::V1::BaseController
  def pull
    render json: Sync::Pull.new(current_account, since: params.fetch(:since, 0)).call
  end

  def push
    changes = params.require(:changes)
    unless changes.respond_to?(:to_unsafe_h)
      return render_error :unprocessable_entity, "validation_failed", "changes must be an object"
    end

    render json: Sync::Push.new(current_account, changes: changes.to_unsafe_h).call
  end
end
