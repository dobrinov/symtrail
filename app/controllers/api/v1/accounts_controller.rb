class Api::V1::AccountsController < Api::V1::BaseController
  def show
    render json: { account: account_json(current_account) }
  end
end
