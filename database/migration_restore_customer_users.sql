-- Re-add demo customer logins (password for all: pass123).
-- Run on Azure MySQL if customer users rows are missing after removing Clerk.

INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
SELECT 'ava', '$2b$10$ln0e7K3JSgwg9CfBfXaDiOhz2eHHIecynPD5mu0DIHj2ccafuQwme', 'Customer', NULL, 1
WHERE EXISTS (SELECT 1 FROM customer WHERE CustomerID = 1 AND IsDeleted = 0)
  AND NOT EXISTS (SELECT 1 FROM users WHERE Username = 'ava' AND IsDeleted = 0);

INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
SELECT 'jordan', '$2b$10$ln0e7K3JSgwg9CfBfXaDiOhz2eHHIecynPD5mu0DIHj2ccafuQwme', 'Customer', NULL, 2
WHERE EXISTS (SELECT 1 FROM customer WHERE CustomerID = 2 AND IsDeleted = 0)
  AND NOT EXISTS (SELECT 1 FROM users WHERE Username = 'jordan' AND IsDeleted = 0);

INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
SELECT 'sam', '$2b$10$ln0e7K3JSgwg9CfBfXaDiOhz2eHHIecynPD5mu0DIHj2ccafuQwme', 'Customer', NULL, 3
WHERE EXISTS (SELECT 1 FROM customer WHERE CustomerID = 3 AND IsDeleted = 0)
  AND NOT EXISTS (SELECT 1 FROM users WHERE Username = 'sam' AND IsDeleted = 0);

INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
SELECT 'riley', '$2b$10$ln0e7K3JSgwg9CfBfXaDiOhz2eHHIecynPD5mu0DIHj2ccafuQwme', 'Customer', NULL, 4
WHERE EXISTS (SELECT 1 FROM customer WHERE CustomerID = 4 AND IsDeleted = 0)
  AND NOT EXISTS (SELECT 1 FROM users WHERE Username = 'riley' AND IsDeleted = 0);
