# College ERP - Database Documentation (Draft)

This document describes the schema design, tables, relationships, and data dictionary planned for the College ERP database.

## Entity Relationship Summary

```
+---------------+        +-------------------+        +----------------+
|    Students   |<-------|      Results      |        |    Teachers    |
+---------------+        +-------------------+        +----------------+
        |                          |                          |
        |                          |                          |
        v                          v                          v
+---------------+        +-------------------+        +----------------+
|     Fees      |        | StudentAttendance |        |TeacherAttendanc|
+---------------+        +-------------------+        +----------------+
```

## Tables Specification

### 1. `users`
- `id` (INT, Primary Key, Auto Increment)
- `email` (VARCHAR(255), Unique, Not Null)
- `password_hash` (VARCHAR(255), Not Null)
- `role` (VARCHAR(50), Default 'admin')
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 2. `students`
- `id` (INT, Primary Key, Auto Increment)
- `name` (VARCHAR(150), Not Null)
- `roll_no` (VARCHAR(50), Unique, Not Null)
- `branch` (VARCHAR(100), Not Null)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 3. `teachers`
- `id` (INT, Primary Key, Auto Increment)
- `teacher_id` (VARCHAR(50), Unique, Not Null)
- `name` (VARCHAR(150), Not Null)
- `subject` (VARCHAR(100), Not Null)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 4. `student_attendance`
- `id` (INT, Primary Key, Auto Increment)
- `student_id` (INT, Foreign Key -> students.id)
- `date` (DATE, Not Null)
- `status` (ENUM('Present', 'Absent'), Not Null)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 5. `teacher_attendance`
- `id` (INT, Primary Key, Auto Increment)
- `teacher_id` (INT, Foreign Key -> teachers.id)
- `date` (DATE, Not Null)
- `status` (ENUM('Present', 'Absent'), Not Null)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 6. `fees`
- `id` (INT, Primary Key, Auto Increment)
- `student_id` (INT, Foreign Key -> students.id)
- `amount` (DECIMAL(10,2), Not Null)
- `payment_date` (DATE, Nullable)
- `status` (ENUM('Paid', 'Pending'), Default 'Pending')
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 7. `results`
- `id` (INT, Primary Key, Auto Increment)
- `student_id` (INT, Foreign Key -> students.id)
- `subject` (VARCHAR(100), Not Null)
- `marks` (INT, Not Null)
- `grade` (VARCHAR(5), Not Null)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### 8. `settings`
- `setting_key` (VARCHAR(100), Primary Key)
- `setting_value` (TEXT, Nullable)
- `updated_at` (TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
