import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { format } from 'date-fns';

export type WeeklySchedule = {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // e.g., '9:00 AM'
  endTime: string; // e.g., '10:00 AM'
};

export type ClassModel = {
  id: string;
  name: string;
  subject: string | null;
  timing: string | null;
  days_of_week?: string; // Comma separated, e.g. "1,3,5"
  weekly_schedule?: string; // JSON string of WeeklySchedule[]
};

export type ExtraClassModel = {
  id: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  timing: string;
};

export type StudentModel = {
  id: string;
  class_id: string;
  name: string;
  roll_number: string | null;
  phone: string | null;
  monthly_fee: number | null;
  join_month?: string; // Format: YYYY-MM
  parent_phone?: string | null;
  whatsapp_student?: string | null;
  whatsapp_parent?: string | null;
  admission_date?: string | null; // Format: YYYY-MM-DD
  fees_start_date?: string | null; // Format: YYYY-MM-DD
};

export type AttendanceModel = {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  time: string;
};

export type FeeModel = {
  id: string;
  student_id: string;
  class_id: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid';
  payment_date: string | null;
};

export function useDatabase() {
  const db = useSQLiteContext();

  // Classes
  const getClasses = useCallback(async (): Promise<ClassModel[]> => {
    return await db.getAllAsync<ClassModel>('SELECT * FROM classes WHERE is_deleted = 0');
  }, [db]);

  const addClass = useCallback(async (cls: ClassModel) => {
    const days = cls.days_of_week || '1,2,3,4,5,6';
    const schedule = cls.weekly_schedule || null;
    await db.runAsync(
      "INSERT INTO classes (id, name, subject, timing, days_of_week, weekly_schedule, sync_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), 0)",
      [cls.id, cls.name, cls.subject, cls.timing, days, schedule]
    );
  }, [db]);

  const addExtraClass = useCallback(async (extra: ExtraClassModel) => {
    await db.runAsync(
      "INSERT INTO extra_classes (id, class_id, date, timing, sync_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, 'pending', datetime('now'), 0)",
      [extra.id, extra.class_id, extra.date, extra.timing]
    );
  }, [db]);

  const getExtraClassesByDate = useCallback(async (date: string): Promise<ExtraClassModel[]> => {
    return await db.getAllAsync<ExtraClassModel>(
      'SELECT * FROM extra_classes WHERE date = ? AND is_deleted = 0',
      [date]
    );
  }, [db]);

  const getExtraClassesByClass = useCallback(async (classId: string): Promise<ExtraClassModel[]> => {
    return await db.getAllAsync<ExtraClassModel>(
      'SELECT * FROM extra_classes WHERE class_id = ? AND is_deleted = 0 ORDER BY date DESC',
      [classId]
    );
  }, [db]);

  const deleteClass = useCallback(async (id: string) => {
    await db.runAsync("UPDATE extra_classes SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE class_id = ?", [id]);
    await db.runAsync("UPDATE fees SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE class_id = ?", [id]);
    await db.runAsync("UPDATE attendance SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE class_id = ?", [id]);
    await db.runAsync("UPDATE students SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE class_id = ?", [id]);
    await db.runAsync("UPDATE classes SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?", [id]);
  }, [db]);

  const updateClassSchedule = useCallback(async (id: string, days_of_week: string, weekly_schedule: string) => {
    await db.runAsync(
      "UPDATE classes SET days_of_week = ?, weekly_schedule = ?, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?",
      [days_of_week, weekly_schedule, id]
    );
  }, [db]);

  // Students
  const getStudentsByClass = useCallback(async (classId: string): Promise<StudentModel[]> => {
    return await db.getAllAsync<StudentModel>(
      'SELECT * FROM students WHERE class_id = ? AND is_deleted = 0',
      [classId]
    );
  }, [db]);

  const getAllStudents = useCallback(async (): Promise<StudentModel[]> => {
    return await db.getAllAsync<StudentModel>('SELECT * FROM students WHERE is_deleted = 0');
  }, [db]);

  const getStudentById = useCallback(async (id: string): Promise<StudentModel | null> => {
    return await db.getFirstAsync<StudentModel>(
      'SELECT * FROM students WHERE id = ? AND is_deleted = 0',
      [id]
    );
  }, [db]);

  const addStudent = useCallback(async (student: StudentModel) => {
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const joinMonth = student.join_month || currentMonthStr;
    await db.runAsync(
      "INSERT INTO students (id, class_id, name, roll_number, phone, monthly_fee, join_month, parent_phone, whatsapp_student, whatsapp_parent, admission_date, fees_start_date, sync_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), 0)",
      [student.id, student.class_id, student.name, student.roll_number, student.phone, student.monthly_fee, joinMonth, student.parent_phone || null, student.whatsapp_student || null, student.whatsapp_parent || null, student.admission_date || null, student.fees_start_date || null]
    );
  }, [db]);

  const deleteStudent = useCallback(async (id: string) => {
    await db.runAsync("UPDATE fees SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE student_id = ?", [id]);
    await db.runAsync("UPDATE attendance SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE student_id = ?", [id]);
    await db.runAsync("UPDATE students SET is_deleted = 1, sync_status = 'pending', updated_at = datetime('now') WHERE id = ?", [id]);
  }, [db]);

  const updateStudent = useCallback(async (student: StudentModel) => {
    await db.runAsync(
      `UPDATE students 
       SET name = ?, roll_number = ?, phone = ?, monthly_fee = ?, parent_phone = ?, 
           whatsapp_student = ?, whatsapp_parent = ?, admission_date = ?, fees_start_date = ?,
           sync_status = 'pending', updated_at = datetime('now')
       WHERE id = ?`,
      [
        student.name, 
        student.roll_number, 
        student.phone, 
        student.monthly_fee, 
        student.parent_phone || null, 
        student.whatsapp_student || null, 
        student.whatsapp_parent || null, 
        student.admission_date || null, 
        student.fees_start_date || null, 
        student.id
      ]
    );
  }, [db]);

  // Attendance
  const markAttendance = useCallback(async (attendance: AttendanceModel) => {
    await db.runAsync(
      "INSERT OR REPLACE INTO attendance (id, student_id, class_id, date, status, time, sync_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), 0)",
      [attendance.id, attendance.student_id, attendance.class_id, attendance.date, attendance.status, attendance.time]
    );
  }, [db]);

  const getAttendanceByClassAndDate = useCallback(async (classId: string, date: string): Promise<AttendanceModel[]> => {
    return await db.getAllAsync<AttendanceModel>(
      'SELECT * FROM attendance WHERE class_id = ? AND date = ? AND is_deleted = 0',
      [classId, date]
    );
  }, [db]);

  const getAttendanceByDate = useCallback(async (date: string): Promise<AttendanceModel[]> => {
    return await db.getAllAsync<AttendanceModel>(
      'SELECT * FROM attendance WHERE date = ? AND is_deleted = 0',
      [date]
    );
  }, [db]);

  const getAttendanceByStudent = useCallback(async (studentId: string): Promise<AttendanceModel[]> => {
    return await db.getAllAsync<AttendanceModel>(
      'SELECT * FROM attendance WHERE student_id = ? AND is_deleted = 0 ORDER BY date DESC',
      [studentId]
    );
  }, [db]);

  // Fees
  const assignFee = useCallback(async (fee: FeeModel) => {
    await db.runAsync(
      "INSERT OR REPLACE INTO fees (id, student_id, class_id, month, amount, status, payment_date, sync_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), 0)",
      [fee.id, fee.student_id, fee.class_id, fee.month, fee.amount, fee.status, fee.payment_date]
    );
  }, [db]);

  const getFeesByClassAndMonth = useCallback(async (classId: string, month: string): Promise<FeeModel[]> => {
    return await db.getAllAsync<FeeModel>(
      'SELECT * FROM fees WHERE class_id = ? AND month = ? AND is_deleted = 0',
      [classId, month]
    );
  }, [db]);

  const getFeesByMonth = useCallback(async (month: string): Promise<FeeModel[]> => {
    return await db.getAllAsync<FeeModel>(
      'SELECT * FROM fees WHERE month = ? AND is_deleted = 0',
      [month]
    );
  }, [db]);

  const getFeesByStudent = useCallback(async (studentId: string): Promise<FeeModel[]> => {
    return await db.getAllAsync<FeeModel>(
      'SELECT * FROM fees WHERE student_id = ? AND is_deleted = 0 ORDER BY month DESC',
      [studentId]
    );
  }, [db]);

  // Dashboard Summary
  const getDashboardSummary = useCallback(async () => {
    const totalClassesRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM classes WHERE is_deleted = 0');
    const totalStudentsRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE is_deleted = 0');

    // For today's attendance summary and pending fees, we might need specific dates
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const currentMonthStr = format(new Date(), 'yyyy-MM');

    const todayAttendanceRes = await db.getAllAsync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM attendance WHERE date = ? AND is_deleted = 0 GROUP BY status',
      [todayStr]
    );

    const expectedFeesRes = await db.getFirstAsync<{ total: number }>('SELECT SUM(monthly_fee) as total FROM students WHERE is_deleted = 0');
    const paidFeesAmountRes = await db.getFirstAsync<{ total: number }>('SELECT SUM(amount) as total FROM fees WHERE status = "paid" AND month = ? AND is_deleted = 0', [currentMonthStr]);

    // Count of students who have paid
    const paidStudentsRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM fees WHERE status = "paid" AND month = ? AND is_deleted = 0', [currentMonthStr]);
    const pendingFeesCount = (totalStudentsRes?.count || 0) - (paidStudentsRes?.count || 0);

    return {
      totalClasses: totalClassesRes?.count || 0,
      totalStudents: totalStudentsRes?.count || 0,
      todayAttendance: todayAttendanceRes,
      pendingFees: Math.max(0, pendingFeesCount),
      expectedFees: expectedFeesRes?.total || 0,
      paidFees: paidFeesAmountRes?.total || 0,
    };
  }, [db]);

  const getClassSummary = useCallback(async (classId: string, date: string, month: string) => {
    const todayAttendanceRes = await db.getAllAsync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM attendance WHERE class_id = ? AND date = ? AND is_deleted = 0 GROUP BY status',
      [classId, date]
    );
    const expectedFeesRes = await db.getFirstAsync<{ total: number }>('SELECT SUM(monthly_fee) as total FROM students WHERE class_id = ? AND is_deleted = 0', [classId]);
    const paidFeesRes = await db.getFirstAsync<{ total: number }>('SELECT SUM(amount) as total FROM fees WHERE class_id = ? AND status = "paid" AND month = ? AND is_deleted = 0', [classId, month]);

    return {
      todayAttendance: todayAttendanceRes,
      expectedFees: expectedFeesRes?.total || 0,
      paidFees: paidFeesRes?.total || 0,
    };
  }, [db]);

  // Overdue calculation
  const calculateOverdueFees = useCallback(async (studentId: string): Promise<{ monthsDue: string[], totalDue: number }> => {
    const student = await getStudentById(studentId);
    if (!student || (!student.join_month && !student.fees_start_date) || student.monthly_fee == null) return { monthsDue: [], totalDue: 0 };

    const paidRecords = await db.getAllAsync<{ month: string }>(
      'SELECT month FROM fees WHERE student_id = ? AND status = "paid" AND is_deleted = 0',
      [studentId]
    );
    const paidMonths = new Set(paidRecords.map(r => r.month));

    const today = new Date();

    // Default to join_month with day 1 if no fees_start_date is available
    const startDateStr = student.fees_start_date || (student.join_month + '-01');
    const startYear = parseInt(startDateStr.substring(0, 4));
    const startMonth = parseInt(startDateStr.substring(5, 7)) - 1; // 0-indexed
    const startDay = parseInt(startDateStr.substring(8, 10)) || 1;

    let checkDate = new Date(Date.UTC(startYear, startMonth, 1));
    let monthsDue: string[] = [];

    // Today UTC for comparison
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // We only check up to the current month
    while (checkDate.getUTCFullYear() < todayUTC.getUTCFullYear() || 
          (checkDate.getUTCFullYear() === todayUTC.getUTCFullYear() && checkDate.getUTCMonth() <= todayUTC.getUTCMonth())) {
      
      const checkMonthStr = checkDate.toISOString().substring(0, 7);

      if (!paidMonths.has(checkMonthStr)) {
        // Clamp startDay to the last day of this month so 31st doesn't roll into the next month.
        const daysInMonth = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth() + 1, 0)).getUTCDate();
        const clampedStartDay = Math.min(startDay, daysInMonth);
        const dueDate = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), clampedStartDay));
        dueDate.setUTCDate(dueDate.getUTCDate() + 10);

        if (todayUTC > dueDate) {
          monthsDue.push(checkMonthStr);
        }
      }
      
      // Move to next month
      checkDate.setUTCMonth(checkDate.getUTCMonth() + 1);
    }

    return {
      monthsDue,
      totalDue: monthsDue.length * student.monthly_fee
    };
  }, [db, getStudentById]);

  return {
    getClasses,
    addClass,
    deleteClass,
    addExtraClass,
    getExtraClassesByDate,
    getExtraClassesByClass,
    getStudentsByClass,
    getAllStudents,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    markAttendance,
    getAttendanceByClassAndDate,
    getAttendanceByDate,
    getAttendanceByStudent,
    assignFee,
    getFeesByClassAndMonth,
    getFeesByMonth,
    getFeesByStudent,
    getDashboardSummary,
    getClassSummary,
    calculateOverdueFees,
    updateClassSchedule
  };
}
