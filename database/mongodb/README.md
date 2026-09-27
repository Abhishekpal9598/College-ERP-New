# MongoDB Database Configuration & Schema Notes

This directory provides documentation and configuration details for the MongoDB database instance used by College ERP.

## Collections:
- `users`: Administrator and Teacher login accounts with bcrypt hashes.
- `students`: 200 student academic profiles, roll numbers, semesters, branch/department.
- `teachers`: Faculty member records, assigned subjects, and departments.
- `attendances`: Daily attendance logs with compound unique index on `(student, date, subject)`.
- `fees`: Semester fee invoices, payments, and receipt tracking.
- `results`: Academic grades, semester marks, and percentage calculations.

## Seed Data
The complete 200-student database seed file is located in `database/seed/students_200_mongodb.json`.
