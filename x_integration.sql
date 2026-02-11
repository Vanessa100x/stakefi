-- Add X (Twitter) integration columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS x_username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS pfp_url TEXT;

-- Add index for fast username search
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username);

-- Add index for leaderboard sorting (reputation score is in reputation_scores table, 
-- but we might want to query users and join. 
-- The reputation_scores table should already be indexed on score if that's where we sort.)
