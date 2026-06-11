class Rack::Attack
  # Behind Fly's proxy req.ip can resolve to a shared proxy hop, which would
  # throttle all users as one client; Fly-Client-IP carries the edge-verified
  # client address. Falls back to req.ip locally and on other hosts.
  def self.client_ip(req)
    req.get_header("HTTP_FLY_CLIENT_IP") || req.ip
  end

  # Brute-force guard on all auth endpoints (signin, signup, apple, reset).
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    client_ip(req) if req.path.start_with?("/api/v1/auth") && req.post?
  end
end

Rack::Attack.enabled = !Rails.env.test?
