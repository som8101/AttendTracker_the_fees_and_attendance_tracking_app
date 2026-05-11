import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Platform, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, ClassModel } from '../../database/queries';
import { useState, useCallback, useEffect } from 'react';
import { UserPlus, ArrowLeft, ClipboardCheck, DollarSign, User, X, CalendarPlus, Clock } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format, parse } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { checkScheduleOverlap } from '../../utils/schedule';

export default function ClassDetailsScreen() {
  const { id } = useLocalSearchParams();
  const classId = id as string;

  const { getStudentsByClass, addStudent, getClasses, getClassSummary, addExtraClass, getExtraClassesByClass, updateClassSchedule } = useDatabase();
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
  const [parentPhone, setParentPhone] = useState('');
  const [whatsappStudent, setWhatsappStudent] = useState('');
  const [whatsappParent, setWhatsappParent] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date());
  const [feesStartDate, setFeesStartDate] = useState(new Date());
  const [monthlyFee, setMonthlyFee] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState<'admission' | 'fees' | null>(null);

  // Extra Class State
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [extraDate, setExtraDate] = useState(new Date());
  const [extraStartTime, setExtraStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [extraEndTime, setExtraEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));
  const [showPicker, setShowPicker] = useState<'date' | 'start' | 'end' | null>(null);

  // Edit Schedule State
  const [editScheduleModalVisible, setEditScheduleModalVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayTimings, setDayTimings] = useState<Record<number, { start: Date, end: Date }>>({});
  const [showSchedulePicker, setShowSchedulePicker] = useState<{ day: number, type: 'start' | 'end' } | null>(null);
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDayTiming = (dayIdx: number) => {
    return dayTimings[dayIdx] || {
      start: new Date(new Date().setHours(9, 0, 0, 0)),
      end: new Date(new Date().setHours(10, 0, 0, 0))
    };
  };

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

  const openEditScheduleModal = () => {
    if (classInfo?.weekly_schedule) {
      try {
        const schedule = JSON.parse(classInfo.weekly_schedule);
        const newSelectedDays: number[] = [];
        const newDayTimings: Record<number, { start: Date, end: Date }> = {};
        
        schedule.forEach((s: any) => {
          newSelectedDays.push(s.day);
          newDayTimings[s.day] = {
            start: parse(s.startTime, 'h:mm a', new Date()),
            end: parse(s.endTime, 'h:mm a', new Date())
          };
        });
        
        setSelectedDays(newSelectedDays);
        setDayTimings(newDayTimings);
      } catch (e) {
        setSelectedDays([1, 2, 3, 4, 5, 6]);
      }
    }
    setEditScheduleModalVisible(true);
  };

  const handleUpdateSchedule = async () => {
    const scheduleArray = selectedDays.map(dayIdx => {
      const timing = getDayTiming(dayIdx);
      return {
        day: dayIdx,
        startTime: format(timing.start, 'h:mm a'),
        endTime: format(timing.end, 'h:mm a')
      };
    });

    const allClasses = await getClasses();
    const overlapError = checkScheduleOverlap(scheduleArray, allClasses, classId);
    if (overlapError) {
      Alert.alert('Schedule Conflict', overlapError);
      return;
    }

    const daysOfWeek = selectedDays.sort().join(',');
    await updateClassSchedule(classId, daysOfWeek, JSON.stringify(scheduleArray));
    
    setEditScheduleModalVisible(false);
    loadData();
  };

  const onScheduleTimeChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showSchedulePicker;
    if (Platform.OS === 'android') setShowSchedulePicker(null);
    if (selectedDate && currentPicker) {
      setDayTimings(prev => {
        const currentTiming = getDayTiming(currentPicker.day);
        return {
          ...prev,
          [currentPicker.day]: {
            ...currentTiming,
            [currentPicker.type]: selectedDate
          }
        };
      });
    }
  };

  const handleAddStudent = async () => {
    if (!name.trim()) return;

    await addStudent({
      id: uuidv4(),
      class_id: classId,
      name,
      roll_number: rollNumber || null,
      phone: phone || null,
      monthly_fee: monthlyFee ? parseInt(monthlyFee) : null,
      parent_phone: parentPhone || null,
      whatsapp_student: whatsappStudent || null,
      whatsapp_parent: whatsappParent || null,
      admission_date: format(admissionDate, 'yyyy-MM-dd'),
      fees_start_date: format(feesStartDate, 'yyyy-MM-dd'),
    });

    setName('');
    setRollNumber('');
    setPhone('');
    setParentPhone('');
    setWhatsappStudent('');
    setWhatsappParent('');
    setAdmissionDate(new Date());
    setFeesStartDate(new Date());
    setMonthlyFee('');
    setModalVisible(false);
    loadData();
  };

  const onStudentDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showStudentPicker;
    if (Platform.OS === 'android') setShowStudentPicker(null);
    if (selectedDate) {
      if (currentPicker === 'admission') setAdmissionDate(selectedDate);
      else if (currentPicker === 'fees') setFeesStartDate(selectedDate);
    }
  };

  const handleAddExtraClass = async () => {
    const formattedTiming = `${format(extraStartTime, 'h:mm a')} - ${format(extraEndTime, 'h:mm a')}`;
    const dateStr = format(extraDate, 'yyyy-MM-dd');

    // Check for existing extra class on the same date
    const existingExtraClasses = await getExtraClassesByClass(classId);
    if (existingExtraClasses.some(ec => ec.date === dateStr)) {
      Alert.alert('Duplicate Date', 'An extra class is already scheduled on this date.');
      return;
    }

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

  const CARD_COLORS = [
    'bg-emerald-50 border-emerald-200',
    'bg-blue-50 border-blue-200',
    'bg-purple-50 border-purple-200',
    'bg-orange-50 border-orange-200',
    'bg-rose-50 border-rose-200',
    'bg-amber-50 border-amber-200'
  ];
  const ICON_COLORS = ['#059669', '#2563eb', '#7c3aed', '#ea580c', '#e11d48', '#d97706'];

  const renderStudentItem = ({ item, index }: { item: StudentModel, index: number }) => {
    const bgColor = CARD_COLORS[index % CARD_COLORS.length];
    const iconColor = ICON_COLORS[index % ICON_COLORS.length];
    return (
      <TouchableOpacity
        onPress={() => router.push(`/student/${item.id}`)}
        className={`${bgColor} p-4 rounded-2xl mb-3 flex-row items-center border shadow-sm mx-4`}
      >
        <View className="bg-white/70 w-12 h-12 rounded-full items-center justify-center mr-4 shadow-sm">
          <User size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">{item.name}</Text>
          {item.roll_number && <Text className="text-gray-600 text-sm font-medium">Roll: {item.roll_number}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSchedule = () => {
    if (!classInfo?.weekly_schedule) return null;
    try {
      const schedule = JSON.parse(classInfo.weekly_schedule);
      if (!Array.isArray(schedule) || schedule.length === 0) return null;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return (
        <View className="mx-4 mb-4 bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-orange-900 uppercase tracking-wider">Weekly Schedule</Text>
            <TouchableOpacity onPress={() => setEditScheduleModalVisible(true)}>
              <Text className="text-orange-600 font-bold text-xs">EDIT</Text>
            </TouchableOpacity>
          </View>
          {schedule.map((s: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center mb-2 last:mb-0">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-orange-400 mr-2" />
                <Text className="text-orange-800 font-bold">{dayNames[s.day]}</Text>
              </View>
              <Text className="text-orange-900 text-sm font-black bg-orange-100/50 px-2 py-1 rounded-md">{s.startTime} - {s.endTime}</Text>
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
      <View className="bg-emerald-100 pt-14 pb-8 px-4 shadow-sm z-10 flex-row items-center rounded-b-[32px] border-b border-emerald-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/40 p-2 rounded-full">
          <ArrowLeft size={24} color="#064e3b" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-emerald-900">{classInfo?.name || 'Class Details'}</Text>
          <Text className="text-emerald-700 font-bold text-sm">{students.length} Students Enrolled</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Summary Cards */}
        <View className="px-4 pt-4 flex-row justify-between mt-2">
          <TouchableOpacity
            onPress={() => router.push(`/class/${classId}/fees`)}
            className="flex-1 bg-blue-100 p-4 rounded-2xl border border-blue-200 shadow-sm mr-2 items-center"
          >
            <Text className="text-blue-700 text-xs font-bold uppercase mb-1">Expected Fees</Text>
            <Text className="text-2xl font-black text-blue-900">₹{summary.expectedFees}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/class/${classId}/fees`)}
            className="flex-1 bg-indigo-100 p-4 rounded-2xl border border-indigo-200 shadow-sm ml-2 items-center"
          >
            <Text className="text-indigo-700 text-xs font-bold uppercase mb-1">Paid Fees</Text>
            <Text className="text-2xl font-black text-indigo-900">₹{summary.paidFees}</Text>
          </TouchableOpacity>
        </View>

        <View className="mx-4 mt-4 bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm flex-row justify-around items-center">
          <View className="items-center">
            <Text className="text-2xl font-black text-green-600">
              {summary.todayAttendance.find((a) => a.status === 'present')?.count || 0}
            </Text>
            <Text className="text-rose-700 font-bold text-xs mt-1 uppercase">Present</Text>
          </View>
          <View className="w-[1px] h-10 bg-rose-200" />
          <View className="items-center">
            <Text className="text-2xl font-black text-yellow-600">
              {summary.todayAttendance.find((a) => a.status === 'late')?.count || 0}
            </Text>
            <Text className="text-rose-700 font-bold text-xs mt-1 uppercase">Late</Text>
          </View>
          <View className="w-[1px] h-10 bg-rose-200" />
          <View className="items-center">
            <Text className="text-2xl font-black text-red-600">
              {summary.todayAttendance.find((a) => a.status === 'absent')?.count || 0}
            </Text>
            <Text className="text-rose-700 font-bold text-xs mt-1 uppercase">Absent</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row p-4 gap-3">
          <TouchableOpacity
            onPress={() => router.push(`/class/${classId}/attendance`)}
            className="flex-1 bg-emerald-100 p-4 rounded-2xl items-center border border-emerald-200 shadow-sm"
          >
            <View className="bg-white/60 w-12 h-12 rounded-full items-center justify-center mb-2 shadow-sm">
              <ClipboardCheck size={24} color="#059669" />
            </View>
            <Text className="font-bold text-emerald-900 text-sm">Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/class/${classId}/fees`)}
            className="flex-1 bg-amber-100 p-4 rounded-2xl items-center border border-amber-200 shadow-sm"
          >
            <View className="bg-white/60 w-12 h-12 rounded-full items-center justify-center mb-2 shadow-sm">
              <DollarSign size={24} color="#d97706" />
            </View>
            <Text className="font-bold text-amber-900 text-sm">Fees</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExtraModalVisible(true)}
            className="flex-1 bg-purple-100 p-4 rounded-2xl items-center border border-purple-200 shadow-sm"
          >
            <View className="bg-white/60 w-12 h-12 rounded-full items-center justify-center mb-2 shadow-sm">
              <CalendarPlus size={24} color="#7c3aed" />
            </View>
            <Text className="font-bold text-purple-900 text-sm">Extra Class</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule Section */}
        {renderSchedule()}

        {/* Students List */}
        <View className="flex-1 pt-2">
          <Text className="text-xl font-black text-gray-900 mb-4 mx-4">Enrolled Students</Text>
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            renderItem={renderStudentItem}
            scrollEnabled={false} // Since it's inside ScrollView
            ListEmptyComponent={
              <View className="items-center justify-center mt-10">
                <UserPlus size={48} color="#97A6A0" />
                <Text className="text-gray-500 font-bold mt-4 text-lg">No students yet</Text>
              </View>
            }
          />
        </View>
      </ScrollView>

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
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-emerald-900">Add Student</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-emerald-100 p-2 rounded-full">
                <X size={24} color="#064e3b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Student Name"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Roll Number</Text>
                <TextInput
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  placeholder="e.g. 101"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Student Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Student's Phone"
                  keyboardType="phone-pad"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Parent Phone</Text>
                <TextInput
                  value={parentPhone}
                  onChangeText={setParentPhone}
                  placeholder="Parent's Phone"
                  keyboardType="phone-pad"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Student WhatsApp</Text>
                <TextInput
                  value={whatsappStudent}
                  onChangeText={setWhatsappStudent}
                  placeholder="Student's WhatsApp"
                  keyboardType="phone-pad"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Parent WhatsApp</Text>
                <TextInput
                  value={whatsappParent}
                  onChangeText={setWhatsappParent}
                  placeholder="Parent's WhatsApp"
                  keyboardType="phone-pad"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <View className="mb-4 flex-row justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Admission Date</Text>
                  <TouchableOpacity onPress={() => setShowStudentPicker('admission')} className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                    <Text className="text-emerald-900 font-bold text-lg">{format(admissionDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Fees Start Date</Text>
                  <TouchableOpacity onPress={() => setShowStudentPicker('fees')} className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                    <Text className="text-emerald-900 font-bold text-lg">{format(feesStartDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStudentPicker && (
                <DateTimePicker
                  value={showStudentPicker === 'admission' ? admissionDate : feesStartDate}
                  mode="date"
                  display="default"
                  onChange={onStudentDateChange}
                />
              )}

              <View className="mb-6">
                <Text className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">Monthly Fee</Text>
                <TextInput
                  value={monthlyFee}
                  onChangeText={setMonthlyFee}
                  placeholder="Amount (e.g. 1000)"
                  keyboardType="numeric"
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-900 text-lg font-bold"
                  placeholderTextColor="#064e3b"
                />
              </View>

              <TouchableOpacity
                onPress={handleAddStudent}
                className={`p-5 rounded-2xl items-center shadow-md mb-6 ${name.trim() ? 'bg-emerald-600' : 'bg-emerald-300'}`}
                disabled={!name.trim()}
              >
                <Text className="text-white font-black text-xl tracking-wide">Save Student</Text>
              </TouchableOpacity>
            </ScrollView>
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
              <Text className="text-2xl font-black text-purple-900">Schedule Extra Class</Text>
              <TouchableOpacity onPress={() => {
                setExtraModalVisible(false);
                setShowPicker(null);
              }}
                className="bg-purple-50 p-2 rounded-full"
              >
                <X size={24} color="#7c3aed" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wider">Class Date</Text>
              <TouchableOpacity
                onPress={() => setShowPicker('date')}
                className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex-row items-center"
              >
                <CalendarPlus size={24} color="#7c3aed" className="mr-3" />
                <Text className="text-purple-900 font-bold text-lg">{format(extraDate, 'EEEE, MMMM d, yyyy')}</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-8">
              <Text className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wider">Class Timing</Text>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => setShowPicker('start')}
                  className="flex-1 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex-row items-center justify-center"
                >
                  <Clock size={18} color="#7c3aed" className="mr-2" />
                  <Text className="text-purple-900 font-bold text-base">{format(extraStartTime, 'h:mm a')}</Text>
                </TouchableOpacity>

                <Text className="mx-3 text-purple-300 font-black">-</Text>

                <TouchableOpacity
                  onPress={() => setShowPicker('end')}
                  className="flex-1 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex-row items-center justify-center"
                >
                  <Clock size={18} color="#7c3aed" className="mr-2" />
                  <Text className="text-purple-900 font-bold text-base">{format(extraEndTime, 'h:mm a')}</Text>
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
              className="p-5 rounded-2xl items-center bg-purple-600 shadow-md mb-2"
            >
              <Text className="text-white font-black text-xl tracking-wide">Save Extra Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit Schedule Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editScheduleModalVisible}
        onRequestClose={() => setEditScheduleModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-orange-900">Edit Schedule</Text>
              <TouchableOpacity onPress={() => {
                setEditScheduleModalVisible(false);
                setShowSchedulePicker(null);
              }}
                className="bg-orange-50 p-2 rounded-full"
              >
                <X size={24} color="#ea580c" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-orange-800 mb-3 uppercase tracking-wider">Class Days</Text>
              <View className="flex-row justify-between">
                {DAYS.map((day, idx) => {
                  const isSelected = selectedDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setSelectedDays(prev =>
                          prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={`w-11 h-11 rounded-full items-center justify-center border-2 ${isSelected ? 'bg-orange-600 border-orange-600' : 'bg-orange-50 border-orange-100'
                        }`}
                    >
                      <Text className={`font-black text-base ${isSelected ? 'text-white' : 'text-orange-400'}`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dynamic Timings */}
            <ScrollView className="max-h-60 mb-4" showsVerticalScrollIndicator={false}>
              {selectedDays.sort().map(dayIdx => {
                const timing = getDayTiming(dayIdx);
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx];
                return (
                  <View key={dayIdx} className="mb-4">
                    <Text className="text-xs font-bold text-orange-800 mb-2 uppercase tracking-wider">{dayName} Timing</Text>
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() => setShowSchedulePicker({ day: dayIdx, type: 'start' })}
                        className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={18} color="#ea580c" className="mr-2" />
                        <Text className="text-orange-900 font-bold text-base">{format(timing.start, 'h:mm a')}</Text>
                      </TouchableOpacity>

                      <Text className="mx-3 text-orange-300 font-black">-</Text>

                      <TouchableOpacity
                        onPress={() => setShowSchedulePicker({ day: dayIdx, type: 'end' })}
                        className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={18} color="#ea580c" className="mr-2" />
                        <Text className="text-orange-900 font-bold text-base">{format(timing.end, 'h:mm a')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {showSchedulePicker && (
              <DateTimePicker
                value={getDayTiming(showSchedulePicker.day)[showSchedulePicker.type]}
                mode="time"
                display="default"
                onChange={onScheduleTimeChange}
              />
            )}

            <TouchableOpacity
              onPress={handleUpdateSchedule}
              className="p-5 rounded-2xl items-center bg-orange-600 shadow-md mb-2 mt-2"
              disabled={selectedDays.length === 0}
            >
              <Text className="text-white font-black text-xl tracking-wide">Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
