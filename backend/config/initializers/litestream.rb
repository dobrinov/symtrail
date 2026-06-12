# Continuous SQLite replication to S3-compatible storage. No-op unless the
# bucket env vars are present (i.e., disabled in dev/test by default).
Rails.application.configure do
  config.litestream.replica_bucket = ENV["LITESTREAM_REPLICA_BUCKET"]
  config.litestream.replica_key_id = ENV["LITESTREAM_ACCESS_KEY_ID"]
  config.litestream.replica_access_key = ENV["LITESTREAM_SECRET_ACCESS_KEY"]
end
