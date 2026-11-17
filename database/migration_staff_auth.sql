-- Hash seeded staff/customer passwords (pass123) and keep @zoo.com staff emails.
USE final_zoo_db;

UPDATE users
SET Password = '$2b$10$ln0e7K3JSgwg9CfBfXaDiOhz2eHHIecynPD5mu0DIHj2ccafuQwme'
WHERE Password = 'pass123';
