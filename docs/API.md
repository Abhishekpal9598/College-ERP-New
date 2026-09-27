# College ERP - REST API Documentation

Production RESTful API specifications for College ERP.

## Base URL
- **Development**: `http://localhost:5000/api`
- **Response Format**: `application/json`

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

---

## 1. Health Check

### `GET /api/health`
- **Auth**: Public
- **Description**: Verifies backend server and database connection status.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "College ERP backend is running",
  "data": {
    "status": "healthy",
    "uptime": 124.5,
    "timestamp": "2026-09-22T21:45:00.000Z",
    "database": "connected"
  }
}
```

---

## 2. Authentication Module

### `POST /api/auth/login`
- **Auth**: Public
- **Description**: Authenticate user and issue JWT token.
- **Request Body**:
```json
{
  "email": "admin@college.erp",
  "password": "Password@123"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "System Administrator",
      "email": "admin@college.erp",
      "role": "admin"
    }
  }
}
```
- **Errors**: `400 Bad Request` (missing/invalid fields), `401 Unauthorized` (invalid email/password).

### `GET /api/auth/me`
- **Auth**: Private (`Bearer <token>`)
- **Description**: Get current user profile.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "System Administrator",
    "email": "admin@college.erp",
    "role": "admin",
    "createdAt": "2026-09-22T20:00:00.000Z"
  }
}
```
- **Errors**: `401 Unauthorized` (missing/invalid/expired token).

---

## 3. Student Module

### `GET /api/students`
- **Auth**: Private
- **Query Parameters**:
  - `search` (string): Search by name, rollNumber, studentId, email
  - `department` (string): Filter by department
  - `course` (string): Filter by course
  - `semester` (number): Filter by semester (1-12)
  - `section` (string): Filter by section (A, B, C)
  - `status` (string): `active`, `inactive`, `graduated`, `suspended`
  - `feeStatus` (string): `paid`, `partial`, `pending`
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `sort` (string, default: `-createdAt`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Students fetched successfully",
  "data": [
    {
      "_id": "6501a2b3c4d5e6f7a8b9c001",
      "studentId": "STU1001",
      "rollNumber": "2026CS101",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "email": "rahul.sharma@college.erp",
      "phone": "9876543210",
      "department": "Computer Science",
      "course": "B.Tech",
      "semester": 4,
      "section": "A",
      "feeStatus": "pending",
      "status": "active"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### `GET /api/students/:id`
- **Auth**: Private
- **Response `200 OK`**: Single student object.
- **Errors**: `404 Not Found` (student not found).

### `POST /api/students`
- **Auth**: Private
- **Request Body**:
```json
{
  "studentId": "STU1001",
  "rollNumber": "2026CS101",
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul.sharma@college.erp",
  "phone": "9876543210",
  "gender": "male",
  "course": "B.Tech",
  "department": "Computer Science",
  "semester": 4,
  "section": "A",
  "address": "New Delhi, India",
  "guardianName": "Sanjay Sharma",
  "guardianPhone": "9876543211"
}
```
- **Response `201 Created`**: Created student object.
- **Errors**: `400 Bad Request` (validation error), `409 Conflict` (duplicate studentId, rollNumber, or email).

### `PUT /api/students/:id`
- **Auth**: Private
- **Request Body**: Fields to update.
- **Response `200 OK`**: Updated student object.
- **Errors**: `404 Not Found`, `409 Conflict`.

### `DELETE /api/students/:id`
- **Auth**: Private (Role: `admin`)
- **Response `200 OK`**: `{ "success": true, "message": "Student deleted successfully", "data": { "id": "..." } }`.
- **Errors**: `403 Forbidden`, `404 Not Found`.

---

## 4. Teacher Module

### `GET /api/teachers`
- **Auth**: Private
- **Query Parameters**: `search`, `department`, `subject`, `status`, `page`, `limit`
- **Response `200 OK`**: List of teacher records.

### `GET /api/teachers/:id`
- **Auth**: Private
- **Response `200 OK`**: Single teacher record.

### `POST /api/teachers`
- **Auth**: Private
- **Request Body**:
```json
{
  "teacherId": "TCH101",
  "firstName": "Amit",
  "lastName": "Patel",
  "email": "amit.patel@college.erp",
  "phone": "9123456789",
  "department": "Computer Science",
  "subject": "Data Structures",
  "designation": "Associate Professor"
}
```
- **Response `201 Created`**: Created teacher object.
- **Errors**: `400 Bad Request`, `409 Conflict`.

### `PUT /api/teachers/:id`
- **Auth**: Private
- **Response `200 OK`**: Updated teacher object.

### `DELETE /api/teachers/:id`
- **Auth**: Private (Role: `admin`)
- **Response `200 OK`**: Teacher deleted response.

---

## 5. Attendance Module

### `GET /api/attendance`
- **Auth**: Private
- **Query Parameters**: `date` (YYYY-MM-DD), `subject`, `semester`, `section`, `status`, `student`
- **Response `200 OK`**: List of attendance records.

### `POST /api/attendance`
- **Auth**: Private
- **Request Body (Single)**:
```json
{
  "student": "6501a2b3c4d5e6f7a8b9c001",
  "date": "2026-09-22",
  "status": "present",
  "subject": "Data Structures",
  "semester": 4,
  "section": "A"
}
```
- **Request Body (Batch)**:
```json
{
  "batch": [
    { "student": "6501a2b3c4d5e6f7a8b9c001", "date": "2026-09-22", "status": "present", "subject": "Data Structures" },
    { "student": "6501a2b3c4d5e6f7a8b9c002", "date": "2026-09-22", "status": "absent", "subject": "Data Structures" }
  ]
}
```
- **Response `201 Created`**: Recorded attendance.
- **Errors**: `400 Bad Request`, `409 Conflict` (duplicate attendance for same student/date/subject).

### `PUT /api/attendance/:id`
- **Auth**: Private
- **Response `200 OK`**: Updated attendance record.

### `GET /api/attendance/student/:studentId`
- **Auth**: Private
- **Description**: Returns attendance history and calculated attendance percentage for a student.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Student attendance retrieved successfully",
  "data": {
    "student": { "id": "...", "name": "Rahul Sharma", "rollNumber": "2026CS101" },
    "summary": {
      "totalClasses": 20,
      "presentCount": 18,
      "absentCount": 2,
      "lateCount": 0,
      "attendancePercentage": 90
    },
    "records": [ ... ]
  }
}
```

---

## 6. Fees Module

### `GET /api/fees`
- **Auth**: Private
- **Query Parameters**: `student`, `status` (`paid`, `partial`, `pending`), `academicYear`, `semester`
- **Response `200 OK`**: List of fee records with populated student details.

### `POST /api/fees`
- **Auth**: Private
- **Request Body**:
```json
{
  "student": "6501a2b3c4d5e6f7a8b9c001",
  "academicYear": "2025-2026",
  "semester": 4,
  "totalAmount": 50000,
  "paidAmount": 30000,
  "paymentMethod": "upi",
  "transactionReference": "UPI-123456"
}
```
- **Response `201 Created`**: Created fee record with automatically calculated `pendingAmount: 20000` and `status: "partial"`.

### `PUT /api/fees/:id`
- **Auth**: Private
- **Response `200 OK`**: Updated fee record.

### `GET /api/fees/student/:studentId`
- **Auth**: Private
- **Description**: Returns fee ledger and financial summary for a student.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Student fee records retrieved successfully",
  "data": {
    "student": { "id": "...", "name": "Rahul Sharma", "feeStatus": "partial" },
    "summary": { "totalAmount": 50000, "totalPaid": 30000, "totalPending": 20000, "recordsCount": 1 },
    "records": [ ... ]
  }
}
```

---

## 7. Results Module

### `GET /api/results`
- **Auth**: Private
- **Query Parameters**: `student`, `semester`, `subject`, `examType`, `academicYear`
- **Response `200 OK`**: List of result entries.

### `POST /api/results`
- **Auth**: Private
- **Request Body**:
```json
{
  "student": "6501a2b3c4d5e6f7a8b9c001",
  "subject": "Operating Systems",
  "semester": 4,
  "marks": 85,
  "maxMarks": 100,
  "examType": "final",
  "academicYear": "2025-2026"
}
```
- **Response `201 Created`**: Created result entry with auto-calculated `percentage: 85` and `grade: "A"`.
- **Errors**: `400 Bad Request` (marks exceeding maxMarks).

### `PUT /api/results/:id`
- **Auth**: Private
- **Response `200 OK`**: Updated result entry with re-calculated grade.

### `GET /api/results/student/:studentId`
- **Auth**: Private
- **Description**: Returns academic report card and overall percentage for a student.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Student academic results retrieved successfully",
  "data": {
    "student": { "id": "...", "name": "Rahul Sharma", "rollNumber": "2026CS101" },
    "summary": {
      "totalSubjects": 5,
      "totalMarksObtained": 420,
      "totalMaxMarks": 500,
      "overallPercentage": 84,
      "overallGrade": "A"
    },
    "results": [ ... ]
  }
}
```

---

## 8. Dashboard Module

### `GET /api/dashboard/stats`
- **Auth**: Private
- **Description**: Returns real-time database aggregated statistics.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Dashboard statistics fetched successfully",
  "data": {
    "totalStudents": 150,
    "totalTeachers": 24,
    "presentToday": 142,
    "absentToday": 8,
    "pendingFees": 350000,
    "totalFeeCollected": 1250000,
    "recentStudents": [ ... ],
    "recentResults": [ ... ]
  }
}
```
