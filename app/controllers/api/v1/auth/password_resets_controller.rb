class Api::V1::Auth::PasswordResetsController < Api::V1::BaseController
  skip_before_action :authenticate!

  def create
    account = Account.find_by(email: params[:email].to_s.strip.downcase)
    if account&.password_digest.present?
      token = account.generate_token_for(:password_reset)
      PasswordResetMailer.reset(account, token).deliver_later
    end
    head :accepted
  end

  def confirm
    account = Account.find_by_token_for(:password_reset, params[:token].to_s)
    return render_error(:unauthorized, "invalid_reset_token", "Invalid or expired reset token") unless account

    if account.update(password: params[:password])
      account.sessions.delete_all
      head :ok
    else
      render_error :unprocessable_entity, "validation_failed",
                   account.errors.full_messages.to_sentence
    end
  end
end
