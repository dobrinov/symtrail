class PasswordResetMailer < ApplicationMailer
  def reset(account, token)
    @token = token
    mail to: account.email, subject: "Reset your Symtrail password"
  end
end
