class Api::V1::SyncController < Api::V1::BaseController
  def pull
    render json: Sync::Pull.new(current_account, since: params.fetch(:since, 0)).call
  end

  def push
    changes = params.require(:changes).to_unsafe_h
    render json: Sync::Push.new(current_account, changes: changes).call
  end
end
