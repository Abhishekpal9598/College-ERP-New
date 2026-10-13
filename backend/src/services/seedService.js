const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

// Concurrency lock to prevent startup race conditions
let isSeedingInProgress = false;

/**
 * Seed initial administrative users, baseline student roster, and initial faculty
 * Idempotent: Never deletes or overwrites existing user accounts or data
 */
const seedAdminUsers = async () => {
    if (isSeedingInProgress) {
        return;
    }
    isSeedingInProgress = true;

    try {
        // 1. Seed Administrative Users
        const defaultAdminEmail = (process.env.ADMIN_EMAIL || "admin@college.erp").toLowerCase().trim();
        const defaultAdminPassword = process.env.ADMIN_PASSWORD || "Password@123";
        const defaultAdminName = process.env.ADMIN_NAME || "System Administrator";

        const seedUsers = [
            {
                name: defaultAdminName,
                email: defaultAdminEmail,
                password: defaultAdminPassword,
                role: "admin"
            },
            {
                name: "Abhishek Pal",
                email: (process.env.ABHISHEK_EMAIL || "abhipal895@gmail.com").toLowerCase().trim(),
                password: process.env.ABHISHEK_PASSWORD || "95982536",
                role: "admin"
            },
            {
                name: "Ankush",
                email: (process.env.ANKUSH_EMAIL || "ankushddu7983@gmail.com").toLowerCase().trim(),
                password: process.env.ANKUSH_PASSWORD || "12345678",
                role: "admin"
            }
        ];

        for (const userData of seedUsers) {
            const existing = await User.findOne({ email: userData.email });
            if (!existing) {
                // Password hashing is performed automatically by User model pre-save hook using bcrypt
                await User.create(userData);
                console.log(`[Seed] Seeded initial administrative account: ${userData.email}`);
            }
            // If user already exists, preserve the account as-is without overwriting
        }

        // Verify and promote only the primary owner account if configured
        const primarySuperAdminEmail = (process.env.PRIMARY_SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
        if (!primarySuperAdminEmail) {
            console.warn("[Security] PRIMARY_SUPER_ADMIN_EMAIL environment variable is not configured. No super_admin promotion performed.");
        } else {
            const primaryUser = await User.findOne({ email: primarySuperAdminEmail });
            if (!primaryUser) {
                console.warn(`[Security] PRIMARY_SUPER_ADMIN_EMAIL '${primarySuperAdminEmail}' does not match any existing account. Fail-safe active.`);
            } else if (primaryUser.role !== "super_admin") {
                primaryUser.role = "super_admin";
                primaryUser.status = "active";
                primaryUser.isEmailVerified = true;
                await primaryUser.save();
                console.log(`[Security] Verified primary owner account promoted to super_admin: ${primarySuperAdminEmail}`);
            }
        }

        // 2. Seed 25 Students if table has fewer than 25 students
        const currentStudentCount = await Student.countDocuments();
        if (currentStudentCount < 25) {
            const studentRoster = [
                { id: "STU1001", roll: "2026CS101", first: "Aarav", last: "Sharma", dept: "Computer Science", course: "B.Tech", sem: 4, sec: "A", gender: "male" },
                { id: "STU1002", roll: "2026CS102", first: "Aditi", last: "Verma", dept: "Computer Science", course: "B.Tech", sem: 4, sec: "A", gender: "female" },
                { id: "STU1003", roll: "2026CS103", first: "Akash", last: "Gupta", dept: "Computer Science", course: "B.Tech", sem: 4, sec: "B", gender: "male" },
                { id: "STU1004", roll: "2026CS104", first: "Ananya", last: "Singh", dept: "Computer Science", course: "B.Tech", sem: 6, sec: "A", gender: "female" },
                { id: "STU1005", roll: "2026CS105", first: "Arjun", last: "Reddy", dept: "Computer Science", course: "B.Tech", sem: 6, sec: "B", gender: "male" },
                { id: "STU1006", roll: "2026IT201", first: "Bhavya", last: "Patel", dept: "Information Technology", course: "B.Tech", sem: 2, sec: "A", gender: "female" },
                { id: "STU1007", roll: "2026IT202", first: "Chirag", last: "Mehta", dept: "Information Technology", course: "B.Tech", sem: 2, sec: "A", gender: "male" },
                { id: "STU1008", roll: "2026IT203", first: "Deepika", last: "Nair", dept: "Information Technology", course: "B.Tech", sem: 4, sec: "A", gender: "female" },
                { id: "STU1009", roll: "2026IT204", first: "Dev", last: "Kumar", dept: "Information Technology", course: "B.Tech", sem: 4, sec: "B", gender: "male" },
                { id: "STU1010", roll: "2026IT205", first: "Esha", last: "Iyer", dept: "Information Technology", course: "B.Tech", sem: 6, sec: "A", gender: "female" },
                { id: "STU1011", roll: "2026EC301", first: "Gaurav", last: "Mishra", dept: "Electronics & Comm", course: "B.Tech", sem: 4, sec: "A", gender: "male" },
                { id: "STU1012", roll: "2026EC302", first: "Harshita", last: "Joshi", dept: "Electronics & Comm", course: "B.Tech", sem: 4, sec: "A", gender: "female" },
                { id: "STU1013", roll: "2026EC303", first: "Ishaan", last: "Kashyap", dept: "Electronics & Comm", course: "B.Tech", sem: 6, sec: "A", gender: "male" },
                { id: "STU1014", roll: "2026EC304", first: "Jaya", last: "Pandey", dept: "Electronics & Comm", course: "B.Tech", sem: 6, sec: "B", gender: "female" },
                { id: "STU1015", roll: "2026EC305", first: "Karan", last: "Malhotra", dept: "Electronics & Comm", course: "B.Tech", sem: 8, sec: "A", gender: "male" },
                { id: "STU1016", roll: "2026ME401", first: "Kavya", last: "Rao", dept: "Mechanical Engg", course: "B.Tech", sem: 2, sec: "A", gender: "female" },
                { id: "STU1017", roll: "2026ME402", first: "Manish", last: "Tiwari", dept: "Mechanical Engg", course: "B.Tech", sem: 4, sec: "A", gender: "male" },
                { id: "STU1018", roll: "2026ME403", first: "Neha", last: "Choudhary", dept: "Mechanical Engg", course: "B.Tech", sem: 4, sec: "B", gender: "female" },
                { id: "STU1019", roll: "2026ME404", first: "Nikhil", last: "Deshmukh", dept: "Mechanical Engg", course: "B.Tech", sem: 6, sec: "A", gender: "male" },
                { id: "STU1020", roll: "2026ME405", first: "Pooja", last: "Saxena", dept: "Mechanical Engg", course: "B.Tech", sem: 8, sec: "A", gender: "female" },
                { id: "STU1021", roll: "2026CE501", first: "Prateek", last: "Dubey", dept: "Civil Engg", course: "B.Tech", sem: 2, sec: "A", gender: "male" },
                { id: "STU1022", roll: "2026CE502", first: "Riya", last: "Bhatia", dept: "Civil Engg", course: "B.Tech", sem: 4, sec: "A", gender: "female" },
                { id: "STU1023", roll: "2026CE503", first: "Rohan", last: "Aggarwal", dept: "Civil Engg", course: "B.Tech", sem: 4, sec: "B", gender: "male" },
                { id: "STU1024", roll: "2026CE504", first: "Sneha", last: "Kulkarni", dept: "Civil Engg", course: "B.Tech", sem: 6, sec: "A", gender: "female" },
                { id: "STU1025", roll: "2026CE505", first: "Varun", last: "Yadav", dept: "Civil Engg", course: "B.Tech", sem: 8, sec: "A", gender: "male" }
            ];

            for (const s of studentRoster) {
                const existingStudent = await Student.findOne({ rollNumber: s.roll });
                if (!existingStudent) {
                    await Student.create({
                        studentId: s.id,
                        rollNumber: s.roll,
                        firstName: s.first,
                        lastName: s.last,
                        email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@college.erp`,
                        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
                        gender: s.gender,
                        course: s.course,
                        department: s.dept,
                        semester: s.sem,
                        section: s.sec,
                        feeStatus: "pending",
                        status: "active"
                    });
                }
            }
            console.log(`[Seed] Seeded baseline student roster into database`);
        }

        // 3. Seed Teachers if fewer than 5 exist
        const currentTeacherCount = await Teacher.countDocuments();
        if (currentTeacherCount < 5) {
            const teacherRoster = [
                { teacherId: "TCH101", firstName: "Dr. Rajesh", lastName: "Sharma", email: "rajesh.sharma@college.erp", dept: "Computer Science", subject: "Data Structures", desig: "Professor & HOD" },
                { teacherId: "TCH102", firstName: "Dr. Priya", lastName: "Verma", email: "priya.verma@college.erp", dept: "Computer Science", subject: "Operating Systems", desig: "Associate Professor" },
                { teacherId: "TCH103", firstName: "Prof. Vikram", lastName: "Singh", email: "vikram.singh@college.erp", dept: "Information Technology", subject: "Database Management", desig: "Assistant Professor" },
                { teacherId: "TCH104", firstName: "Dr. Sunita", lastName: "Patel", email: "sunita.patel@college.erp", dept: "Electronics & Comm", subject: "Digital Electronics", desig: "Associate Professor" },
                { teacherId: "TCH105", firstName: "Prof. Anil", lastName: "Kumar", email: "anil.kumar@college.erp", dept: "Mechanical Engg", subject: "Thermodynamics", desig: "Assistant Professor" }
            ];

            for (const t of teacherRoster) {
                const existing = await Teacher.findOne({ teacherId: t.teacherId });
                if (!existing) {
                    await Teacher.create({
                        teacherId: t.teacherId,
                        firstName: t.firstName,
                        lastName: t.lastName,
                        email: t.email,
                        phone: `91234${Math.floor(10000 + Math.random() * 90000)}`,
                        department: t.dept,
                        subject: t.subject,
                        designation: t.desig,
                        status: "active"
                    });
                }
            }
            console.log(`[Seed] Seeded baseline faculty into database`);
        }
    } catch (err) {
        console.warn(`[Seed] Notice during database verification: ${err.message}`);
    } finally {
        isSeedingInProgress = false;
    }
};

module.exports = {
    seedAdminUsers
};
