
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add delete policy for cash_payments (admins already have ALL but explicit delete is clearer)
-- The ALL policy already covers delete, so no additional policy needed.
