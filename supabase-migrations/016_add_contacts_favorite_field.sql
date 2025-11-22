-- Migration: Add favorite field to contacts table
-- Description: Adds is_favorite boolean field to allow users to mark contacts as favorites

-- Add is_favorite column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create index for faster querying of favorite contacts
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);

-- Add updated_at column if it doesn't exist (for tracking changes)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contacts_timestamp ON contacts;
CREATE TRIGGER trigger_update_contacts_timestamp
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Add comment for documentation
COMMENT ON COLUMN contacts.is_favorite IS 'Flag to indicate if contact is marked as favorite by user';
