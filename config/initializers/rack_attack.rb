class Rack::Attack
  # Brute-force guard on all auth endpoints (signin, signup, apple, reset).
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/auth") && req.post?
  end
end

Rack::Attack.enabled = !Rails.env.test?
