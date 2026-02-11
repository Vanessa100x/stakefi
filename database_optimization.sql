-- Database Optimization Indices

-- Improve project lookups by owner
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);

-- Improve attestation lookups
CREATE INDEX IF NOT EXISTS idx_attestations_to ON attestations(to_wallet);
CREATE INDEX IF NOT EXISTS idx_attestations_from ON attestations(from_wallet);

-- Improve user lookups (likely already indexed by PK, but good to ensure if filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
