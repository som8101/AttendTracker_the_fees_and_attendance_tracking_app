import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useDatabase, ClassModel, StudentModel, AttendanceModel, ExtraClassModel } from '../../database/queries';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronDown, ChevronUp, Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function AttendanceTabScreen() {
  const { getClasses, getAllStudents, getAttendanceByDate, markAttendance, getExtraClassesByDate } = useDatabase();
  
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceModel>>({});
  const [dayExtraClasses, setDayExtraClasses] = useState<ExtraClassModel[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
    return dates;
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  
  const scrollViewRef = useRef<ScrollView>(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDisplay = format(selectedDate, 'EEEE, MMMM d, yyyy');

  const loadData = async () => {
    const dayOfWeek = selectedDate.getDay();

    const [allClasses, allStudents, attendanceData, extraClasses] = await Promise.all([
      getClasses(),
      getAllStudents(),
      getAttendanceByDate(selectedDateStr),
      getExtraClassesByDate(selectedDateStr)
    ]);

    const extraClassIds = new Set(extraClasses.map(ec => ec.class_id));

    const scheduledClasses = allClasses.filter(cls => {
      const days = cls.days_of_week ? cls.days_of_week.split(',').map(Number) : [1,2,3,4,5,6];
      return days.includes(dayOfWeek) || extraClassIds.has(cls.id);
    });

    setClasses(scheduledClasses);
    setStudents(allStudents);
    setDayExtraClasses(extraClasses);

    const recordsMap = attendanceData.reduce((acc, curr) => {
      acc[curr.student_id] = curr;
      return acc;
    }, {} as Record<string, AttendanceModel>);
    setAttendanceRecords(recordsMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDateStr])
  );

  useEffect(() => {
    // Scroll to the selected date if it's in the current month, else scroll to start
    setTimeout(() => {
      if (selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear()) {
        const dateIndex = selectedDate.getDate() - 1; // 0-indexed
        scrollViewRef.current?.scrollTo({ x: dateIndex * 64 - 150, animated: true });
      } else {
        scrollViewRef.current?.scrollTo({ x: 0, animated: true });
      }
    }, 100);
  }, [currentMonth, selectedDate]);

  const handleMark = async (studentId: string, classId: string, status: 'present' | 'absent' | 'late') => {
    const existing = attendanceRecords[studentId];
    const newRecord: AttendanceModel = {
      id: existing ? existing.id : uuidv4(),
      student_id: studentId,
      class_id: classId,
      date: selectedDateStr,
      status,
      time: new Date().toISOString(),
    };

    await markAttendance(newRecord);
    
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: newRecord
    }));
  };

  // Group students by class
  const studentsByClass = useMemo(() => {
    const map: Record<string, StudentModel[]> = {};
    students.forEach(s => {
      if (!map[s.class_id]) map[s.class_id] = [];
      map[s.class_id].push(s);
    });
    return map;
  }, [students]);

  const toggleExpand = (classId: string) => {
    // Accordion behavior: close if already open, else open and close others
    setExpandedClassId(prev => prev === classId ? null : classId);
  };

  const renderStudentItem = (student: StudentModel) => {
    const record = attendanceRecords[student.id];
    const status = record?.status;
    const timeFormatted = record ? format(new Date(record.time), 'h:mm a') : '';

    return (
      <View key={student.id} className="bg-white p-4 rounded-xl mb-3 border border-marble-200 shadow-sm mx-2">
        <View className="flex-row justify-between items-start mb-4">
          <TouchableOpacity onPress={() => router.push(`/student/${student.id}`)}>
            <Text className="text-lg font-bold text-marble-900">{student.name}</Text>
            {student.roll_number && <Text className="text-marble-500 text-sm">Roll No: {student.roll_number}</Text>}
          </TouchableOpacity>
          {timeFormatted ? (
            <Text className="text-marble-400 text-xs mt-1">{timeFormatted}</Text>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => handleMark(student.id, student.class_id, 'present')}
            className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl ${
              status === 'present' ? 'bg-green-500' : 'bg-gray-100'
            }`}
          >
            <Check size={16} color={status === 'present' ? '#ffffff' : '#6b7280'} />
            <Text className={`ml-1.5 font-bold ${status === 'present' ? 'text-white' : 'text-gray-500'}`}>
              Present
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(student.id, student.class_id, 'late')}
            className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl ${
              status === 'late' ? 'bg-yellow-500' : 'bg-gray-100'
            }`}
          >
            <Clock size={16} color={status === 'late' ? '#ffffff' : '#6b7280'} />
            <Text className={`ml-1.5 font-bold ${status === 'late' ? 'text-white' : 'text-gray-500'}`}>
              Late
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(student.id, student.class_id, 'absent')}
            className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl ${
              status === 'absent' ? 'bg-red-500' : 'bg-gray-100'
            }`}
          >
            <X size={16} color={status === 'absent' ? '#ffffff' : '#6b7280'} />
            <Text className={`ml-1.5 font-bold ${status === 'absent' ? 'text-white' : 'text-gray-500'}`}>
              Absent
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderClassAccordion = ({ item: cls }: { item: ClassModel }) => {
    const isExpanded = expandedClassId === cls.id;
    const classStudents = studentsByClass[cls.id] || [];
    
    const presentCount = classStudents.filter(s => attendanceRecords[s.id]?.status === 'present').length;

    const extraClass = dayExtraClasses.find(ec => ec.class_id === cls.id);
    let displayTiming = extraClass ? extraClass.timing : "Time not set";

    if (!extraClass && cls.weekly_schedule) {
      try {
        const scheduleArray = JSON.parse(cls.weekly_schedule);
        const daySchedule = scheduleArray.find((s: any) => s.day === selectedDate.getDay());
        if (daySchedule) {
          displayTiming = `${daySchedule.startTime} - ${daySchedule.endTime}`;
        }
      } catch (e) {}
    }

    return (
      <View className="mb-4">
        {/* Accordion Header */}
        <TouchableOpacity 
          onPress={() => toggleExpand(cls.id)}
          className={`p-4 mx-4 shadow-sm flex-row items-center justify-between z-10 ${
            isExpanded 
              ? 'bg-marble-800 rounded-t-2xl rounded-b-none' 
              : 'bg-white rounded-2xl border border-marble-200'
          }`}
        >
          <View>
            <Text className={`text-lg font-bold ${isExpanded ? 'text-white' : 'text-marble-900'}`}>{cls.name}</Text>
            <View className="flex-row items-center mt-1">
              <Clock size={12} color={isExpanded ? '#93BFB7' : '#97A6A0'} />
              <Text className={`text-sm ml-1 ${isExpanded ? 'text-marble-300' : 'text-marble-500'}`}>
                {displayTiming}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            {isExpanded ? <ChevronUp size={24} color="#ffffff" /> : <ChevronDown size={24} color="#97A6A0" />}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View className="bg-marble-100/50 mx-4 pt-4 pb-2 px-2 rounded-b-2xl border border-t-0 border-marble-200">
            {/* Sub-header block from UI inspiration */}
            <View className="bg-white p-4 rounded-xl mb-4 flex-row justify-between items-center shadow-sm">
              <View>
                <Text className="text-marble-500 text-sm">Class Date</Text>
                <Text className="text-marble-900 font-bold">{selectedDisplay}</Text>
              </View>
              <View className="items-end">
                <Text className="text-marble-500 text-sm">Present</Text>
                <Text className="text-marble-800 font-bold text-lg">{presentCount} / {classStudents.length}</Text>
              </View>
            </View>

            {/* Students List */}
            {classStudents.length > 0 ? (
              classStudents.map(student => renderStudentItem(student))
            ) : (
              <View className="items-center py-6">
                <Text className="text-marble-400 italic">No students in this class.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Custom Header */}
      <View className="bg-emerald-500 pt-16 pb-8 px-6 items-center rounded-b-[32px] shadow-lg z-20">
        <Text className="text-2xl font-black text-white tracking-wide">Attendance</Text>
      </View>

      {/* Calendar Header & Strip */}
      <View className="bg-white pt-8 pb-4 -mt-6 border-b border-marble-100 z-10 shadow-sm">
        {/* Month Selector */}
        <View className="flex-row items-center justify-between px-4 py-2 mb-2">
          <TouchableOpacity onPress={prevMonth} className="p-2 bg-marble-50 rounded-full">
            <ChevronLeft size={20} color="#387373" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-marble-900">
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2 bg-marble-50 rounded-full">
            <ChevronRight size={20} color="#387373" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Days */}
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-2"
        >
          {calendarDates.map((date, idx) => {
            const isSelected = format(date, 'yyyy-MM-dd') === selectedDateStr;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedDate(date)}
                className={`items-center justify-center w-14 h-16 rounded-2xl mx-1 ${
                  isSelected ? 'bg-marble-700' : 'bg-marble-50 border border-marble-100'
                }`}
              >
                <Text className={`text-xs font-medium mb-1 ${isSelected ? 'text-marble-200' : 'text-marble-500'}`}>
                  {format(date, 'EEE')}
                </Text>
                <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-marble-900'}`}>
                  {format(date, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={expandedClassId ? classes.filter(cls => cls.id === expandedClassId) : classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClassAccordion}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <Text className="text-marble-400 text-lg">No classes available.</Text>
          </View>
        }
      />
    </View>
  );
}
