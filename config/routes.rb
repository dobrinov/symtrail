Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      namespace :auth do
        post :signup, to: "registrations#create"
        post :signin, to: "sessions#create"
        delete :session, to: "sessions#destroy"
        post :apple, to: "apple#create"
        post :password_reset, to: "password_resets#create"
        post "password_reset/confirm", to: "password_resets#confirm"
      end
      resource :account, only: [:show, :update, :destroy]
      get "sync/pull", to: "sync#pull"
      post "sync/push", to: "sync#push"
    end
  end
end
