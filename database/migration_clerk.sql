-- Link Clerk customer identities to the customer table.
USE final_zoo_db;

ALTER TABLE customer
  ADD COLUMN ClerkUserId varchar(255) NULL AFTER Email,
  ADD UNIQUE KEY customer_clerk_user (ClerkUserId);
