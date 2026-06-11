class Api::V1::Auth::AppleController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    claims = AppleTokenVerifier.verify!(params.require(:identity_token))
    account = find_or_create_account(claims)
    status = account.previously_new_record? ? :created : :ok
    _session, token = Session.start!(account: account, device_name: params[:device_name])
    render json: { account: account_json(account), token: token }, status: status
  rescue AppleTokenVerifier::Error
    render_error :unauthorized, "invalid_apple_token", "Apple sign-in could not be verified"
  rescue ActiveRecord::RecordInvalid
    render_error :unprocessable_entity, "validation_failed",
                 "Could not create an account from this Apple ID"
  end

  private

  def find_or_create_account(claims)
    account = Account.find_by(apple_user_id: claims[:apple_user_id])
    return account if account

    if claims[:email].present? && claims[:email_verified]
      existing = Account.find_by(email: claims[:email].downcase)
      if existing
        existing.update!(apple_user_id: claims[:apple_user_id])
        return existing
      end
    end

    Account.create!(apple_user_id: claims[:apple_user_id], email: claims[:email])
  end
end
