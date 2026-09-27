# College ERP - Database

This directory is reserved for database schemas, migration scripts, and seed files in subsequent phases.

## Planned Schema Entities
- `Users` (id, name, email, password_hash, role, created_at)
- `Students` (id, name, roll_no, branch, created_at)
- `Teachers` (id, teacher_id, name, subject, created_at)
- `Attendance` (id, entity_type, entity_id, date, status)
- `Fees` (id, student_id, amount, payment_date, status)
- `Results` (id, student_id, subject, marks, grade)
- `Settings` (key, value)
