class Api::V1::Auth::RegistrationsController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    account = Account.new(email: params[:email], password: params[:password])
    if account.save
      _session, token = Session.start!(account: account, device_name: params[:device_name])
      render json: { account: account_json(account), token: token }, status: :created
    else
      render_error :unprocessable_entity, "validation_failed",
                   account.errors.full_messages.to_sentence
    end
  end
end
