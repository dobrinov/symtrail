class Api::V1::AccountsController < Api::V1::BaseController
  VALID_TEMP_UNITS = %w[c f].freeze

  def show
    render json: { account: account_json(current_account) }
  end

  def update
    settings = params.require(:settings).permit(:temp_unit).to_h
    if settings.key?("temp_unit") && !VALID_TEMP_UNITS.include?(settings["temp_unit"])
      return render_error :unprocessable_entity, "validation_failed", "temp_unit must be c or f"
    end

    current_account.update!(settings: current_account.settings.merge(settings))
    render json: { account: account_json(current_account) }
  end

  def destroy
    current_account.destroy!
    head :no_content
  end
end
