-- Optional: drop Clerk linkage after switching back to local JWT auth.
-- Safe to run if ClerkUserId exists; ignore errors if the column is already gone.

ALTER TABLE customer
  DROP INDEX customer_clerk_user,
  DROP COLUMN ClerkUserId;
