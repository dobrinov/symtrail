class Api::V1::Auth::SessionsController < Api::V1::BaseController
  skip_before_action :authenticate!, only: :create

  def create
    account = Account.find_by(email: params[:email].to_s.strip.downcase)
    if account&.password_digest.present? && account.authenticate(params[:password].to_s)
      _session, token = Session.start!(account: account, device_name: params[:device_name])
      render json: { account: account_json(account), token: token }
    else
      render_error :unauthorized, "invalid_credentials", "Invalid email or password"
    end
  end

  def destroy
    current_session.destroy!
    head :no_content
  end
end
