-- Add UTM tracking columns to quotes table
ALTER TABLE quotes ADD COLUMN utm_source TEXT;
ALTER TABLE quotes ADD COLUMN utm_medium TEXT;
ALTER TABLE quotes ADD COLUMN utm_campaign TEXT;
ALTER TABLE quotes ADD COLUMN utm_term TEXT;
ALTER TABLE quotes ADD COLUMN utm_content TEXT;

-- Add UTM tracking columns to flatpack_waitlist table
ALTER TABLE flatpack_waitlist ADD COLUMN utm_source TEXT;
ALTER TABLE flatpack_waitlist ADD COLUMN utm_medium TEXT;
ALTER TABLE flatpack_waitlist ADD COLUMN utm_campaign TEXT;
ALTER TABLE flatpack_waitlist ADD COLUMN utm_term TEXT;
ALTER TABLE flatpack_waitlist ADD COLUMN utm_content TEXT;
