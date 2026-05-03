import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, ClassModel } from '../../database/queries';
import { useState, useCallback, useEffect } from 'react';
import { UserPlus, ArrowLeft, ClipboardCheck, DollarSign, User, X, CalendarPlus, Clock } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function ClassDetailsScreen() {
  const { id } = useLocalSearchParams();
  const classId = id as string;

  const { getStudentsByClass, addStudent, getClasses, getClassSummary, addExtraClass } = useDatabase();
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [classInfo, setClassInfo] = useState<ClassModel | null>(null);
  const [summary, setSummary] = useState({
    todayAttendance: [] as any[],
    expectedFees: 0,
    paidFees: 0,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');

  // Extra Class State
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [extraDate, setExtraDate] = useState(new Date());
  const [extraStartTime, setExtraStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [extraEndTime, setExtraEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));
  const [showPicker, setShowPicker] = useState<'date' | 'start' | 'end' | null>(null);

  const loadData = async () => {
    const classData = await getClasses();
    const currentClass = classData.find(c => c.id === classId);
    if (currentClass) setClassInfo(currentClass);

    const studentData = await getStudentsByClass(classId);
    setStudents(studentData);

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);
    const summaryData = await getClassSummary(classId, todayStr, currentMonthStr);
    setSummary(summaryData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [classId])
  );

  const handleAddStudent = async () => {
    if (!name.trim()) return;

    await addStudent({
      id: uuidv4(),
      class_id: classId,
      name,
      roll_number: rollNumber || null,
      phone: phone || null,
      monthly_fee: monthlyFee ? parseInt(monthlyFee) : null,
    });

    setName('');
    setRollNumber('');
    setPhone('');
    setMonthlyFee('');
    setModalVisible(false);
    loadData();
  };

  const handleAddExtraClass = async () => {
    const formattedTiming = `${format(extraStartTime, 'h:mm a')} - ${format(extraEndTime, 'h:mm a')}`;
    const dateStr = format(extraDate, 'yyyy-MM-dd');

    await addExtraClass({
      id: uuidv4(),
      class_id: classId,
      date: dateStr,
      timing: formattedTiming
    });

    setExtraModalVisible(false);
    // Optionally show a toast or alert
  };

  const onExtraChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showPicker;
    if (Platform.OS === 'android') setShowPicker(null);
    if (selectedDate) {
      if (currentPicker === 'date') setExtraDate(selectedDate);
      else if (currentPicker === 'start') setExtraStartTime(selectedDate);
      else if (currentPicker === 'end') setExtraEndTime(selectedDate);
    }
  };

  const renderStudentItem = ({ item }: { item: StudentModel }) => (
    <TouchableOpacity
      onPress={() => router.push(`/student/${item.id}`)}
      className="bg-white p-4 rounded-xl mb-3 flex-row items-center border border-marble-100 shadow-sm"
    >
      <View className="bg-marble-50 w-10 h-10 rounded-full items-center justify-center mr-4">
        <User size={18} color="#387373" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-semibold text-marble-900">{item.name}</Text>
        {item.roll_number && <Text className="text-marble-500 text-sm">Roll: {item.roll_number}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderSchedule = () => {
    if (!classInfo?.weekly_schedule) return null;
    try {
      const schedule = JSON.parse(classInfo.weekly_schedule);
      if (!Array.isArray(schedule) || schedule.length === 0) return null;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return (
        <View className="mx-4 mb-4 bg-white p-4 rounded-xl border border-marble-100 shadow-sm">
          <Text className="text-sm font-bold text-marble-900 mb-3">Weekly Schedule</Text>
          {schedule.map((s: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center mb-2 last:mb-0">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-marble-400 mr-2" />
                <Text className="text-marble-700 font-medium">{dayNames[s.day]}</Text>
              </View>
              <Text className="text-marble-500 text-sm font-semibold bg-marble-50 px-2 py-1 rounded-md">{s.startTime} - {s.endTime}</Text>
            </View>
          ))}
        </View>
      );
    } catch (e) {
      return null;
    }
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#2D3E40" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-marble-900">{classInfo?.name || 'Class Details'}</Text>
          <Text className="text-marble-500 text-sm">{students.length} Students</Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View className="px-4 pt-4 flex-row justify-between">
        <TouchableOpacity
          onPress={() => router.push(`/class/${classId}/fees`)}
          className="flex-1 bg-white p-3 rounded-xl border border-marble-100 shadow-sm mr-2 items-center"
        >
          <Text className="text-marble-500 text-xs font-medium">Expected Fees</Text>
          <Text className="text-lg font-bold text-marble-900">₹{summary.expectedFees}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/class/${classId}/fees`)}
          className="flex-1 bg-white p-3 rounded-xl border border-marble-100 shadow-sm ml-2 items-center"
        >
          <Text className="text-marble-500 text-xs font-medium">Paid Fees</Text>
          <Text className="text-lg font-bold text-marble-700">₹{summary.paidFees}</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-3 bg-white p-3 rounded-xl border border-marble-100 shadow-sm flex-row justify-around items-center">
        <View className="items-center">
          <Text className="text-xl font-bold text-marble-700">
            {summary.todayAttendance.find((a) => a.status === 'present')?.count || 0}
          </Text>
          <Text className="text-marble-500 text-xs">Present Today</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-marble-500">
            {summary.todayAttendance.find((a) => a.status === 'late')?.count || 0}
          </Text>
          <Text className="text-marble-500 text-xs">Late Today</Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-marble-900">
            {summary.todayAttendance.find((a) => a.status === 'absent')?.count || 0}
          </Text>
          <Text className="text-marble-500 text-xs">Absent Today</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row p-4 gap-2">
        <TouchableOpacity
          onPress={() => router.push(`/class/${classId}/attendance`)}
          className="flex-1 bg-marble-50 p-3 rounded-2xl items-center border border-marble-200"
        >
          <View className="bg-white w-10 h-10 rounded-full items-center justify-center mb-1 shadow-sm">
            <ClipboardCheck size={20} color="#387373" />
          </View>
          <Text className="font-semibold text-marble-700 text-xs">Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/class/${classId}/fees`)}
          className="flex-1 bg-marble-50 p-3 rounded-2xl items-center border border-marble-200"
        >
          <View className="bg-white w-10 h-10 rounded-full items-center justify-center mb-1 shadow-sm">
            <DollarSign size={20} color="#387373" />
          </View>
          <Text className="font-semibold text-marble-700 text-xs">Fees</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setExtraModalVisible(true)}
          className="flex-1 bg-marble-50 p-3 rounded-2xl items-center border border-marble-200"
        >
          <View className="bg-white w-10 h-10 rounded-full items-center justify-center mb-1 shadow-sm">
            <CalendarPlus size={20} color="#387373" />
          </View>
          <Text className="font-semibold text-marble-700 text-xs">Extra Class</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Section */}
      {renderSchedule()}

      {/* Students List */}
      <View className="flex-1 px-4">
        <Text className="text-lg font-bold text-marble-900 mb-4">Students</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <UserPlus size={48} color="#97A6A0" />
              <Text className="text-marble-500 mt-4 text-lg">No students yet</Text>
            </View>
          }
        />
      </View>

      {/* Add Student FAB */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 right-6 bg-marble-700 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <UserPlus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Add Student Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-marble-900">Add Student</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#97A6A0" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-1">Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Student Name"
                className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-1">Roll Number</Text>
              <TextInput
                value={rollNumber}
                onChangeText={setRollNumber}
                placeholder="e.g. 101"
                className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-1">Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Parent's Phone"
                keyboardType="phone-pad"
                className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-marble-700 mb-1">Monthly Fee</Text>
              <TextInput
                value={monthlyFee}
                onChangeText={setMonthlyFee}
                placeholder="Amount (e.g. 1000)"
                keyboardType="numeric"
                className="bg-marble-50 border border-marble-200 rounded-lg p-3 text-marble-900"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <TouchableOpacity
              onPress={handleAddStudent}
              className={`p-4 rounded-xl items-center ${name.trim() ? 'bg-marble-700' : 'bg-marble-400'}`}
              disabled={!name.trim()}
            >
              <Text className="text-white font-semibold text-lg">Save Student</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extra Class Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={extraModalVisible}
        onRequestClose={() => setExtraModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-marble-900">Schedule Extra Class</Text>
              <TouchableOpacity onPress={() => {
                setExtraModalVisible(false);
                setShowPicker(null);
              }}>
                <X size={24} color="#97A6A0" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-2">Class Date</Text>
              <TouchableOpacity
                onPress={() => setShowPicker('date')}
                className="bg-marble-50 border border-marble-200 rounded-xl p-4 flex-row items-center"
              >
                <CalendarPlus size={20} color="#387373" className="mr-3" />
                <Text className="text-marble-900 font-medium text-base">{format(extraDate, 'EEEE, MMMM d, yyyy')}</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-8">
              <Text className="text-sm font-medium text-marble-700 mb-2">Class Timing</Text>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => setShowPicker('start')}
                  className="flex-1 bg-marble-50 border border-marble-200 rounded-xl p-4 flex-row items-center justify-center"
                >
                  <Clock size={16} color="#387373" className="mr-2" />
                  <Text className="text-marble-900 font-medium">{format(extraStartTime, 'h:mm a')}</Text>
                </TouchableOpacity>

                <Text className="mx-3 text-marble-400 font-bold">-</Text>

                <TouchableOpacity
                  onPress={() => setShowPicker('end')}
                  className="flex-1 bg-marble-50 border border-marble-200 rounded-xl p-4 flex-row items-center justify-center"
                >
                  <Clock size={16} color="#387373" className="mr-2" />
                  <Text className="text-marble-900 font-medium">{format(extraEndTime, 'h:mm a')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showPicker && (
              <DateTimePicker
                value={showPicker === 'date' ? extraDate : showPicker === 'start' ? extraStartTime : extraEndTime}
                mode={showPicker === 'date' ? 'date' : 'time'}
                display="default"
                onChange={onExtraChange}
              />
            )}

            <TouchableOpacity
              onPress={handleAddExtraClass}
              className="p-4 rounded-xl items-center bg-marble-700 shadow-sm"
            >
              <Text className="text-white font-bold text-lg">Save Extra Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
