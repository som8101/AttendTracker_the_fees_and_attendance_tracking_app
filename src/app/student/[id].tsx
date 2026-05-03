import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, AttendanceModel, FeeModel } from '../../database/queries';
import { useState, useCallback } from 'react';
import { ArrowLeft, User, Phone, CheckCircle2, XCircle, Clock, CalendarDays, Wallet, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const studentId = id as string;

  const { getStudentById, getAttendanceByStudent, getFeesByStudent, deleteStudent, calculateOverdueFees } = useDatabase();
  const [student, setStudent] = useState<StudentModel | null>(null);
  const [attendance, setAttendance] = useState<AttendanceModel[]>([]);
  const [fees, setFees] = useState<FeeModel[]>([]);
  
  const [overdue, setOverdue] = useState<{ monthsDue: string[], totalDue: number }>({ monthsDue: [], totalDue: 0 });
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async () => {
    const studentData = await getStudentById(studentId);
    setStudent(studentData);

    if (studentData) {
      const attendanceData = await getAttendanceByStudent(studentId);
      setAttendance(attendanceData);

      const feeData = await getFeesByStudent(studentId);
      setFees(feeData);

      const overdueData = await calculateOverdueFees(studentId);
      setOverdue(overdueData);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [studentId])
  );

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;

  const handleDelete = () => {
    if (!student) return;
    
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${student.name}? This will permanently remove all of their attendance and fee records.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteStudent(studentId);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#2D3E40" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-marble-900">Student Profile</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} className="p-2 bg-red-50 rounded-full">
          <Trash2 size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {student && (
          <View className="bg-white p-6 rounded-2xl border border-marble-100 shadow-sm mb-6 items-center">
            <View className="bg-marble-50 w-20 h-20 rounded-full items-center justify-center mb-4">
              <User size={40} color="#387373" />
            </View>
            <Text className="text-2xl font-bold text-marble-900">{student.name}</Text>
            {student.roll_number && (
              <Text className="text-marble-500 mt-1">Roll Number: {student.roll_number}</Text>
            )}
            {student.phone && (
              <TouchableOpacity 
                onPress={() => Linking.openURL(`tel:${student.phone}`)}
                className="flex-row items-center mt-2 bg-marble-50 px-3 py-1.5 rounded-full"
              >
                <Phone size={14} color="#97A6A0" />
                <Text className="text-marble-700 ml-2">{student.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text className="text-lg font-bold text-marble-900 mb-3">Fees Status</Text>
        <TouchableOpacity 
          onPress={() => { if (overdue.monthsDue.length > 0) setModalVisible(true) }}
          className={`p-4 rounded-2xl border shadow-sm mb-6 flex-row justify-between items-center ${
            overdue.monthsDue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}
        >
          <View>
            <Text className={`text-lg font-bold ${overdue.monthsDue.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {overdue.monthsDue.length > 0 ? `${overdue.monthsDue.length} Months Due` : 'All Clear'}
            </Text>
            {overdue.monthsDue.length > 0 && (
              <Text className="text-red-500 text-sm mt-1">Tap to view details</Text>
            )}
          </View>
          <View>
            <Text className={`text-2xl font-black ${overdue.monthsDue.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{overdue.totalDue}
            </Text>
          </View>
        </TouchableOpacity>

        <Text className="text-lg font-bold text-marble-900 mb-3">Attendance Stats</Text>
        <View className="bg-white p-4 rounded-2xl border border-marble-100 shadow-sm flex-row justify-between mb-6">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-green-500">{presentCount}</Text>
            <Text className="text-marble-500 text-xs mt-1">Present</Text>
          </View>
          <View className="w-[1px] bg-marble-100 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-yellow-500">{lateCount}</Text>
            <Text className="text-marble-500 text-xs mt-1">Late</Text>
          </View>
          <View className="w-[1px] bg-marble-100 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-red-500">{absentCount}</Text>
            <Text className="text-marble-500 text-xs mt-1">Absent</Text>
          </View>
        </View>

        <Text className="text-lg font-bold text-marble-900 mb-3">Fee History</Text>
        {fees.length === 0 ? (
          <Text className="text-marble-400 mb-6 italic">No fee records found.</Text>
        ) : (
          <View className="mb-6">
            {fees.map((fee) => (
              <View key={fee.id} className="bg-white p-4 rounded-xl mb-2 flex-row justify-between items-center border border-marble-100 shadow-sm">
                <View className="flex-row items-center gap-3">
                  <Wallet size={20} color="#97A6A0" className="ml-3" />
                  <View className="mr-5">
                    <Text className="font-semibold text-marble-900">{fee.month}</Text>
                    <Text className="text-marble-500 text-sm">₹{fee.amount}</Text>
                  </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${fee.status === 'paid' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-semibold ${fee.status === 'paid' ? 'text-green-700' : 'text-red-700'}`}>
                    {fee.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="text-lg font-bold text-marble-900 mb-3">Recent Attendance</Text>
        {attendance.length === 0 ? (
          <Text className="text-marble-400 mb-10 italic">No attendance records found.</Text>
        ) : (
          <View className="mb-10">
            {attendance.slice(0, 10).map((record) => (
              <View key={record.id} className="bg-white p-4 rounded-xl mb-2 border border-marble-100 shadow-sm flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CalendarDays size={18} color="#97A6A0" className="mr-3" />
                  <Text className="font-medium text-marble-900">{record.date}</Text>
                </View>
                {record.status === 'present' && <Text className="text-green-600 font-semibold">Present</Text>}
                {record.status === 'late' && <Text className="text-yellow-600 font-semibold">Late</Text>}
                {record.status === 'absent' && <Text className="text-red-600 font-semibold">Absent</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Due Months Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-marble-900">Overdue Months</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XCircle size={24} color="#97A6A0" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mb-4">
              {overdue.monthsDue.map((monthStr, index) => (
                <View key={index} className="flex-row justify-between items-center bg-red-50 p-4 rounded-xl mb-3 border border-red-100">
                  <Text className="text-red-900 font-bold text-lg">{monthStr}</Text>
                  <Text className="text-red-700 font-bold">₹{student?.monthly_fee}</Text>
                </View>
              ))}
            </ScrollView>

            <View className="pt-4 border-t border-marble-100 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-marble-900">Total Due</Text>
              <Text className="text-2xl font-black text-red-600">₹{overdue.totalDue}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
