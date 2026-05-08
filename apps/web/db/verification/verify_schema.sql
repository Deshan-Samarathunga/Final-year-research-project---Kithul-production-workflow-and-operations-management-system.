-- Verification checks for the current KithulFlow schema.
-- Run against the kithulflow database after migrations.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'AdminUser',
    'Employee',
    'Center',
    'SystemCan',
    'CanHistory',
    'IssueNote'
  )
ORDER BY table_name;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'AdminUser_userId_key',
    'AdminUser_email_key',
    'Employee_userId_key',
    'Center_centerId_key',
    'SystemCan_canCode_key',
    'CanHistory_canId_idx',
    'IssueNote_status_idx'
  )
ORDER BY indexname;

SELECT conname
FROM pg_constraint
WHERE conname IN (
    'CanHistory_canId_fkey',
    'IssueNote_centerId_fkey'
)
ORDER BY conname;
