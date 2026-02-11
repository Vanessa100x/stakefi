-- Add reward_token_symbol to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS reward_token_symbol TEXT;

-- Update existing projects (Placeholder - logic to update involves backend script, but strict SQL can't fetch from chain)
-- We will update the API to populate this for new projects.
-- Existing projects will have NULL, frontend should fallback to "TOKEN" or fetch if NULL.
