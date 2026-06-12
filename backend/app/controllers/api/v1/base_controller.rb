class Api::V1::BaseController < ActionController::API
  wrap_parameters false

  before_action :authenticate!

  rescue_from ActiveRecord::RecordNotFound do
    render_error :not_found, "not_found", "Record not found"
  end
  rescue_from ActionController::ParameterMissing do |e|
    render_error :unprocessable_entity, "missing_parameter", e.message
  end

  private

  attr_reader :current_account, :current_session

  def authenticate!
    token = request.headers["Authorization"].to_s.delete_prefix("Bearer ").strip
    @current_session = token.present? ? Session.find_by_token(token) : nil
    return render_error(:unauthorized, "invalid_token", "Invalid or expired token") unless @current_session

    # Throttled: sync polling would otherwise turn every request into a write.
    if @current_session.last_used_at.nil? || @current_session.last_used_at < 5.minutes.ago
      @current_session.touch(:last_used_at)
    end
    @current_account = @current_session.account
  end

  def render_error(status, code, message)
    render json: { error: { code: code, message: message } }, status: status
  end

  def account_json(account)
    { id: account.id, email: account.email, settings: account.settings }
  end
end
