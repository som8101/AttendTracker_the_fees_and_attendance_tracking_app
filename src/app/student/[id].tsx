import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Linking, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, AttendanceModel, FeeModel } from '../../database/queries';
import { useState, useCallback } from 'react';
import { ArrowLeft, User, Phone, CheckCircle2, XCircle, Clock, CalendarDays, Wallet, Trash2, Pencil, X } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { v4 as uuidv4 } from 'uuid';

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const studentId = id as string;

  const { getStudentById, getAttendanceByStudent, getFeesByStudent, deleteStudent, calculateOverdueFees, updateStudent, assignFee } = useDatabase();
  const [student, setStudent] = useState<StudentModel | null>(null);
  const [attendance, setAttendance] = useState<AttendanceModel[]>([]);
  const [fees, setFees] = useState<FeeModel[]>([]);

  const [overdue, setOverdue] = useState<{ monthsDue: string[], totalDue: number }>({ monthsDue: [], totalDue: 0 });
  const [modalVisible, setModalVisible] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editWhatsappStudent, setEditWhatsappStudent] = useState('');
  const [editWhatsappParent, setEditWhatsappParent] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('');
  const [editAdmissionDate, setEditAdmissionDate] = useState(new Date());
  const [editFeesStartDate, setEditFeesStartDate] = useState(new Date());
  const [showEditPicker, setShowEditPicker] = useState<'admission' | 'fees' | null>(null);

  const openEditModal = () => {
    if (!student) return;
    setEditName(student.name);
    setEditRollNumber(student.roll_number || '');
    setEditPhone(student.phone || '');
    setEditParentPhone(student.parent_phone || '');
    setEditWhatsappStudent(student.whatsapp_student || '');
    setEditWhatsappParent(student.whatsapp_parent || '');
    setEditMonthlyFee(student.monthly_fee ? student.monthly_fee.toString() : '');
    setEditAdmissionDate(student.admission_date ? parseISO(student.admission_date) : new Date());
    setEditFeesStartDate(student.fees_start_date ? parseISO(student.fees_start_date) : new Date());
    setEditModalVisible(true);
  };

  const handleUpdateStudent = async () => {
    if (!student || !editName.trim()) return;

    await updateStudent({
      ...student,
      name: editName,
      roll_number: editRollNumber || null,
      phone: editPhone || null,
      parent_phone: editParentPhone || null,
      whatsapp_student: editWhatsappStudent || null,
      whatsapp_parent: editWhatsappParent || null,
      monthly_fee: editMonthlyFee ? parseInt(editMonthlyFee) : null,
      admission_date: format(editAdmissionDate, 'yyyy-MM-dd'),
      fees_start_date: format(editFeesStartDate, 'yyyy-MM-dd'),
    });

    setEditModalVisible(false);
    loadData();
  };

  const onEditDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showEditPicker;
    if (Platform.OS === 'android') setShowEditPicker(null);
    if (selectedDate) {
      if (currentPicker === 'admission') setEditAdmissionDate(selectedDate);
      else if (currentPicker === 'fees') setEditFeesStartDate(selectedDate);
    }
  };

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

  const handlePayMonth = (monthStr: string) => {
    if (!student) return;
    Alert.alert(
      "Confirm Payment",
      `Mark fees for ${format(parseISO(`${monthStr}-01`), 'MMMM yyyy')} as paid?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          onPress: async () => {
            const newRecord: FeeModel = {
              id: uuidv4(),
              student_id: student.id,
              class_id: student.class_id,
              month: monthStr,
              amount: student.monthly_fee || 0,
              status: 'paid',
              payment_date: new Date().toISOString(),
            };
            await assignFee(newRecord);
            loadData(); // Re-fetch to update due status and fee history
          }
        }
      ]
    );
  };

  const handlePayAll = () => {
    if (!student) return;
    Alert.alert(
      "Pay All Dues",
      `Mark all ${overdue.monthsDue.length} pending months (₹${overdue.totalDue}) as paid?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay All",
          onPress: async () => {
            for (const monthStr of overdue.monthsDue) {
              const newRecord: FeeModel = {
                id: uuidv4(),
                student_id: student.id,
                class_id: student.class_id,
                month: monthStr,
                amount: student.monthly_fee || 0,
                status: 'paid',
                payment_date: new Date().toISOString(),
              };
              await assignFee(newRecord);
            }
            loadData(); // Re-fetch to update due status and fee history
          }
        }
      ]
    );
  };

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
      <View className="bg-blue-500 pt-16 pb-10 px-6 rounded-b-[40px] flex-row items-center justify-between z-0">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 p-2 rounded-full z-0">
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-black text-white">Student Profile</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={openEditModal} className="p-2 bg-white/20 rounded-full mr-3 border border-white/30">
            <Pencil size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} className="p-2 bg-rose-500/80 rounded-full border border-rose-400">
            <Trash2 size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 -mt-8 z-20" contentContainerStyle={{ paddingBottom: 40 }}>
        {student && (
          <View className="bg-white p-6 rounded-[32px] border border-marble-100 shadow-xl mb-6 items-center">
            <View className="bg-blue-100 w-24 h-24 rounded-full items-center justify-center mb-4 shadow-sm">
              <User size={48} color="#2563eb" />
            </View>
            <Text className="text-3xl font-black text-blue-900 text-center">{student.name}</Text>
            {student.roll_number && (
              <Text className="text-blue-700 font-bold mt-1">Roll No: {student.roll_number}</Text>
            )}
            <View className="flex-row flex-wrap justify-center mt-3 gap-2">
              {student.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${student.phone}`)}
                  className="flex-row items-center bg-blue-50 px-4 py-2.5 rounded-full border border-blue-200"
                >
                  <Phone size={16} color="#2563eb" />
                  <Text className="text-blue-800 ml-2 text-sm font-bold">Student: {student.phone}</Text>
                </TouchableOpacity>
              )}
              {student.parent_phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${student.parent_phone}`)}
                  className="flex-row items-center bg-blue-50 px-4 py-2.5 rounded-full border border-blue-200"
                >
                  <Phone size={16} color="#2563eb" />
                  <Text className="text-blue-800 ml-2 text-sm font-bold">Parent: {student.parent_phone}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="flex-row flex-wrap justify-center mt-2 gap-2">
              {student.whatsapp_student && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${student.whatsapp_student}`)}
                  className="flex-row items-center bg-green-50 px-3 py-2 rounded-full border border-green-100"
                >
                  <FontAwesome name="whatsapp" size={16} color="#15803d" />
                  <Text className="text-green-700 ml-2 text-sm font-medium">Student: {student.whatsapp_student}</Text>
                </TouchableOpacity>
              )}
              {student.whatsapp_parent && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${student.whatsapp_parent}`)}
                  className="flex-row items-center bg-green-50 px-3 py-2 rounded-full border border-green-100"
                >
                  <FontAwesome name="whatsapp" size={16} color="#15803d" />
                  <Text className="text-green-700 ml-2 text-sm font-medium">Parent: {student.whatsapp_parent}</Text>
                </TouchableOpacity>
              )}
            </View>

            {(student.admission_date || student.fees_start_date) && (
              <View className="w-full mt-6 p-4 bg-purple-50 rounded-2xl flex-row justify-around border border-purple-100">
                {student.admission_date && (
                  <View className="items-center">
                    <Text className="text-xs font-bold text-purple-500 uppercase tracking-wide">Admission</Text>
                    <Text className="font-black text-purple-900 mt-0.5">{format(parseISO(student.admission_date), 'MMM d, yyyy')}</Text>
                  </View>
                )}
                {student.fees_start_date && (
                  <View className="items-center">
                    <Text className="text-xs font-bold text-purple-500 uppercase tracking-wide">Fee Cycle Start</Text>
                    <Text className="font-black text-purple-900 mt-0.5">{format(parseISO(student.fees_start_date), 'MMM d, yyyy')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <Text className="text-xl font-bold text-marble-900 mb-3 ml-2">Fees Status</Text>
        <TouchableOpacity
          onPress={() => { if (overdue.monthsDue.length > 0) setModalVisible(true) }}
          className={`p-5 rounded-3xl border shadow-md mb-6 flex-row justify-between items-center ${overdue.monthsDue.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
            }`}
        >
          <View>
            <Text className={`text-xl font-black ${overdue.monthsDue.length > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
              {overdue.monthsDue.length > 0 ? `${overdue.monthsDue.length} Months Due` : 'All Clear'}
            </Text>
            {overdue.monthsDue.length > 0 && (
              <Text className="text-rose-600 font-bold text-sm mt-1">Tap to view details</Text>
            )}
          </View>
          <View className={`px-4 py-2 rounded-xl ${overdue.monthsDue.length > 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
            <Text className={`text-2xl font-black ${overdue.monthsDue.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{overdue.totalDue}
            </Text>
          </View>
        </TouchableOpacity>

        <Text className="text-xl font-bold text-marble-900 mb-3 ml-2">Attendance Stats</Text>
        <View className="bg-white p-5 rounded-3xl border border-marble-100 shadow-sm flex-row justify-between mb-8">
          <View className="items-center flex-1">
            <Text className="text-3xl font-black text-emerald-500">{presentCount}</Text>
            <Text className="text-emerald-700 font-bold text-xs mt-1 uppercase tracking-wide">Present</Text>
          </View>
          <View className="w-[1px] bg-marble-100 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-3xl font-black text-amber-500">{lateCount}</Text>
            <Text className="text-amber-700 font-bold text-xs mt-1 uppercase tracking-wide">Late</Text>
          </View>
          <View className="w-[1px] bg-marble-100 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-3xl font-black text-rose-500">{absentCount}</Text>
            <Text className="text-rose-700 font-bold text-xs mt-1 uppercase tracking-wide">Absent</Text>
          </View>
        </View>

        <Text className="text-xl font-bold text-marble-900 mb-3 ml-2">Fee History</Text>
        {fees.length === 0 ? (
          <Text className="text-marble-400 mb-6 italic ml-2">No fee records found.</Text>
        ) : (
          <View className="mb-8">
            {fees.map((fee) => (
              <View key={fee.id} className="bg-white p-4 rounded-2xl mb-3 flex-row justify-between items-center border border-marble-100 shadow-sm">
                <View className="flex-row items-center gap-3">
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${fee.status === 'paid' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <Wallet size={20} color={fee.status === 'paid' ? '#059669' : '#e11d48'} />
                  </View>
                  <View className="mr-5">
                    <Text className="text-lg font-black text-marble-900">{fee.month}</Text>
                    <Text className="text-marble-500 font-bold">₹{fee.amount}</Text>
                  </View>
                </View>
                <View className={`px-4 py-1.5 rounded-full ${fee.status === 'paid' ? 'bg-emerald-100 border border-emerald-200' : 'bg-rose-100 border border-rose-200'}`}>
                  <Text className={`text-xs font-black tracking-wide ${fee.status === 'paid' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fee.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="text-xl font-bold text-marble-900 mb-3 ml-2">Recent Attendance</Text>
        {attendance.length === 0 ? (
          <Text className="text-marble-400 mb-10 italic ml-2">No attendance records found.</Text>
        ) : (
          <View className="mb-10">
            {attendance.slice(0, 10).map((record) => (
              <View key={record.id} className="bg-white p-4 rounded-2xl mb-3 border border-marble-100 shadow-sm flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <CalendarDays size={18} color="#2563eb" />
                  </View>
                  <Text className="text-lg font-bold text-marble-900">{record.date}</Text>
                </View>
                {record.status === 'present' && <Text className="text-emerald-600 font-black">Present</Text>}
                {record.status === 'late' && <Text className="text-amber-600 font-black">Late</Text>}
                {record.status === 'absent' && <Text className="text-rose-600 font-black">Absent</Text>}
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

            <Text className="text-marble-500 text-sm mb-4">Tap a month to mark it as paid.</Text>
            <ScrollView className="mb-4">
              {overdue.monthsDue.map((monthStr, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePayMonth(monthStr)}
                  className="flex-row justify-between items-center bg-red-50 p-4 rounded-xl mb-3 border border-red-100 shadow-sm"
                >
                  <Text className="text-red-900 font-bold text-lg">{format(parseISO(`${monthStr}-01`), 'MMM yyyy')}</Text>
                  <Text className="text-red-700 font-bold">₹{student?.monthly_fee} (Pay)</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="pt-4 border-t border-marble-100 mb-4 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-marble-900">Total Due</Text>
              <Text className="text-2xl font-black text-red-600">₹{overdue.totalDue}</Text>
            </View>

            <TouchableOpacity
              onPress={handlePayAll}
              className="bg-marble-900 p-4 rounded-xl flex-row justify-center items-center shadow-sm"
            >
              <CheckCircle2 size={20} color="#ffffff" />
              <Text className="text-white font-bold ml-2 text-lg">Pay All Dues</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-marble-900">Edit Student</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#97A6A0" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Name *</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Student Name"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Roll Number</Text>
                <TextInput
                  value={editRollNumber}
                  onChangeText={setEditRollNumber}
                  placeholder="e.g. 101"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Student Phone</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Student's Phone"
                  keyboardType="phone-pad"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Parent Phone</Text>
                <TextInput
                  value={editParentPhone}
                  onChangeText={setEditParentPhone}
                  placeholder="Parent's Phone"
                  keyboardType="phone-pad"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Student WhatsApp</Text>
                <TextInput
                  value={editWhatsappStudent}
                  onChangeText={setEditWhatsappStudent}
                  placeholder="Student's WhatsApp"
                  keyboardType="phone-pad"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-marble-700 mb-1">Parent WhatsApp</Text>
                <TextInput
                  value={editWhatsappParent}
                  onChangeText={setEditWhatsappParent}
                  placeholder="Parent's WhatsApp"
                  keyboardType="phone-pad"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <View className="mb-4 flex-row justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-medium text-marble-700 mb-1">Admission Date</Text>
                  <TouchableOpacity onPress={() => setShowEditPicker('admission')} className="bg-marble-50 border border-marble-200 rounded-lg p-3">
                    <Text className="text-marble-900">{format(editAdmissionDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-medium text-marble-700 mb-1">Fees Start Date</Text>
                  <TouchableOpacity onPress={() => setShowEditPicker('fees')} className="bg-marble-50 border border-marble-200 rounded-lg p-3">
                    <Text className="text-marble-900">{format(editFeesStartDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showEditPicker && (
                <DateTimePicker
                  value={showEditPicker === 'admission' ? editAdmissionDate : editFeesStartDate}
                  mode="date"
                  display="default"
                  onChange={onEditDateChange}
                />
              )}

              <View className="mb-6">
                <Text className="text-sm font-medium text-marble-700 mb-1">Monthly Fee</Text>
                <TextInput
                  value={editMonthlyFee}
                  onChangeText={setEditMonthlyFee}
                  placeholder="Amount (e.g. 1000)"
                  keyboardType="numeric"
                  className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                  placeholderTextColor="#97A6A0"
                />
              </View>

              <TouchableOpacity
                onPress={handleUpdateStudent}
                className={`p-4 rounded-xl items-center mb-4 ${editName.trim() ? 'bg-marble-700' : 'bg-marble-400'}`}
                disabled={!editName.trim()}
              >
                <Text className="text-white font-semibold text-lg">Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
