-- Migration: Add source tracking for contacts
-- This distinguishes between manually added contacts vs imported from resources

-- Add added_via column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS added_via TEXT DEFAULT 'manual' CHECK (added_via IN ('manual', 'import'));

-- Update existing contacts to be 'import' by default (assuming they came from resource imports)
-- New contacts will default to 'manual'
UPDATE contacts SET added_via = 'import' WHERE added_via IS NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_contacts_added_via ON contacts(added_via);

COMMENT ON COLUMN contacts.added_via IS 'Tracks how the contact was added: manual (Add button) or import (from resources)';
