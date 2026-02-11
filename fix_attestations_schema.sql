-- Fix missing foreign keys for attestations
-- This is required for the users:from_wallet join to work in the API

-- Add FK for from_wallet (The attester)
ALTER TABLE attestations
ADD CONSTRAINT fk_attestations_from_wallet
FOREIGN KEY (from_wallet)
REFERENCES users(wallet);

-- Add FK for to_wallet (The target)
ALTER TABLE attestations
ADD CONSTRAINT fk_attestations_to_wallet
FOREIGN KEY (to_wallet)
REFERENCES users(wallet);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_attestations_from_wallet ON attestations(from_wallet);
CREATE INDEX IF NOT EXISTS idx_attestations_to_wallet ON attestations(to_wallet);
