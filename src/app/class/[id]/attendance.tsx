import { View, Text, TouchableOpacity, PanResponder } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, AttendanceModel } from '../../../database/queries';
import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Check, X, Clock, Phone, User, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { FontAwesome } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Linking from 'expo-linking';

export default function AttendanceScreen() {
  const { id } = useLocalSearchParams();
  const classId = id as string;
  
  const { getStudentsByClass, getAttendanceByClassAndDate, getAttendanceByStudent, markAttendance } = useDatabase();
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceModel>>({});
  
  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  
  // Recent attendance cache: student_id -> last 5 statuses
  const [recentAttendanceMap, setRecentAttendanceMap] = useState<Record<string, AttendanceModel[]>>({});

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = async () => {
    const studentData = await getStudentsByClass(classId);
    setStudents(studentData);

    const records = await getAttendanceByClassAndDate(classId, today);
    const recordsMap = records.reduce((acc, curr) => {
      acc[curr.student_id] = curr;
      return acc;
    }, {} as Record<string, AttendanceModel>);
    setAttendanceRecords(recordsMap);

    // Fetch recent attendance for all students
    const recentMap: Record<string, AttendanceModel[]> = {};
    for (const student of studentData) {
      const history = await getAttendanceByStudent(student.id);
      // Filter out today so we only show past history (max 10)
      const pastHistory = history.filter(h => h.date !== today).slice(0, 10); 
      recentMap[student.id] = pastHistory;
    }
    setRecentAttendanceMap(recentMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [classId])
  );

  const handleMark = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    const existing = attendanceRecords[studentId];
    const newRecord: AttendanceModel = {
      id: existing ? existing.id : uuidv4(),
      student_id: studentId,
      class_id: classId,
      date: today,
      status,
      time: new Date().toISOString(),
    };

    await markAttendance(newRecord);
    
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: newRecord
    }));

    // Small delay to let the user see the status overlay before sliding
    setTimeout(() => {
      handlersRef.current.handleNext(false);
    }, 300);
  };

  const handlersRef = useRef({
    handleNext: (isSwipe: boolean = false) => {},
    handlePrevious: () => {}
  });

  const handleNext = (isSwipe: boolean = false) => {
    if (currentIndex < students.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (!isSwipe) {
        setShowSummary(true);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Keep ref up to date
  handlersRef.current = { handleNext, handlePrevious };

  // Swiping Gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only claim responder for horizontal swipes to avoid blocking button taps
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe Right -> Go Previous
          handlersRef.current.handlePrevious();
        } else if (gestureState.dx < -50) {
          // Swipe Left -> Go Next (Skip)
          handlersRef.current.handleNext(true); // true prevents jumping to summary on last student
        }
      },
    })
  ).current;


  if (students.length === 0) {
    return (
      <View className="flex-1 bg-marble-50">
        <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#2D3E40" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-marble-900">Today's Attendance</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-marble-400 text-lg">No students to mark.</Text>
        </View>
      </View>
    );
  }

  if (showSummary) {
    const presentCount = Object.values(attendanceRecords).filter(a => a.status === 'present').length;
    const lateCount = Object.values(attendanceRecords).filter(a => a.status === 'late').length;
    const absentCount = Object.values(attendanceRecords).filter(a => a.status === 'absent').length;

    return (
      <View className="flex-1 bg-marble-50 items-center justify-center p-6">
        <View className="bg-white p-8 rounded-3xl items-center w-full shadow-lg border border-marble-100">
          <Check size={64} color="#16a34a" className="mb-4" />
          <Text className="text-3xl font-bold text-marble-900 mb-2">Session Complete!</Text>
          <Text className="text-marble-500 mb-8 text-center text-lg">You have marked attendance for all students.</Text>
          
          <View className="w-full bg-marble-50 p-4 rounded-xl mb-8 flex-row justify-between border border-marble-100">
             <View className="items-center flex-1">
               <Text className="text-2xl font-bold text-green-500">{presentCount}</Text>
               <Text className="text-marble-500 text-xs mt-1">Present</Text>
             </View>
             <View className="w-[1px] bg-marble-200 mx-2" />
             <View className="items-center flex-1">
               <Text className="text-2xl font-bold text-yellow-500">{lateCount}</Text>
               <Text className="text-marble-500 text-xs mt-1">Late</Text>
             </View>
             <View className="w-[1px] bg-marble-200 mx-2" />
             <View className="items-center flex-1">
               <Text className="text-2xl font-bold text-red-500">{absentCount}</Text>
               <Text className="text-marble-500 text-xs mt-1">Absent</Text>
             </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-marble-900 w-full p-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-lg">Finish</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowSummary(false)}
            className="mt-4 p-2"
          >
            <Text className="text-marble-500 font-medium">Review Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStudent = students[currentIndex];
  const currentRecord = attendanceRecords[currentStudent.id];
  const recentHistory = recentAttendanceMap[currentStudent.id] || [];

  return (
    <View className="flex-1 bg-marble-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#2D3E40" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-marble-900">Attendance</Text>
            <Text className="text-marble-500 text-sm">{format(new Date(), 'MMM do, yyyy')}</Text>
          </View>
        </View>
        <View className="bg-marble-100 px-3 py-1 rounded-full">
          <Text className="font-bold text-marble-700">{currentIndex + 1} / {students.length}</Text>
        </View>
      </View>

      <View className="flex-1 px-4 py-8" {...panResponder.panHandlers}>
        {/* Flashcard */}
        <View className="flex-1 bg-white rounded-3xl border border-marble-100 shadow-lg p-6 mb-8 justify-between relative overflow-hidden">
          
          {/* Card Top / Identity */}
          <View className="items-center mt-4">
            <View className="bg-marble-50 w-24 h-24 rounded-full items-center justify-center mb-4">
              <User size={48} color="#387373" />
            </View>
            <Text className="text-3xl font-black text-marble-900 text-center mb-1">{currentStudent.name}</Text>
            {currentStudent.roll_number && (
              <Text className="text-lg text-marble-500 font-medium">Roll No: {currentStudent.roll_number}</Text>
            )}
          </View>

          {/* Contact Info */}
          <View className="my-6">
            <View className="flex-row flex-wrap justify-center mt-3 gap-2">
              {currentStudent.phone && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${currentStudent.phone}`)}
                  className="flex-row items-center bg-marble-50 px-3 py-2 rounded-full border border-marble-100"
                >
                  <Phone size={14} color="#387373" />
                  <Text className="text-marble-700 ml-2 text-sm font-medium">Student: {currentStudent.phone}</Text>
                </TouchableOpacity>
              )}
              {currentStudent.parent_phone && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${currentStudent.parent_phone}`)}
                  className="flex-row items-center bg-marble-50 px-3 py-2 rounded-full border border-marble-100"
                >
                  <Phone size={14} color="#387373" />
                  <Text className="text-marble-700 ml-2 text-sm font-medium">Parent: {currentStudent.parent_phone}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="flex-row flex-wrap justify-center mt-2 gap-2">
              {currentStudent.whatsapp_student && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${currentStudent.whatsapp_student}`)}
                  className="flex-row items-center bg-green-50 px-3 py-2 rounded-full border border-green-100"
                >
                  <FontAwesome name="whatsapp" size={16} color="#15803d" />
                  <Text className="text-green-700 ml-2 text-sm font-medium">Student: {currentStudent.whatsapp_student}</Text>
                </TouchableOpacity>
              )}
              {currentStudent.whatsapp_parent && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${currentStudent.whatsapp_parent}`)}
                  className="flex-row items-center bg-green-50 px-3 py-2 rounded-full border border-green-100"
                >
                  <FontAwesome name="whatsapp" size={16} color="#15803d" />
                  <Text className="text-green-700 ml-2 text-sm font-medium">Parent: {currentStudent.whatsapp_parent}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recent History */}
          <View className="bg-marble-50 p-4 rounded-2xl">
            <Text className="text-center text-xs font-bold text-marble-500 uppercase tracking-widest mb-3">Recent Attendance</Text>
            {recentHistory.length === 0 && !currentRecord ? (
              <Text className="text-center text-marble-400 italic text-sm">No recent records found</Text>
            ) : (
              <View className="flex-row justify-center gap-2 flex-wrap">
                {[...recentHistory].reverse().map((record, i) => (
                  <View key={i} className="items-center w-10 mb-2">
                    <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                      record.status === 'present' ? 'bg-green-100' :
                      record.status === 'late' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {record.status === 'present' && <Check size={14} color="#16a34a" />}
                      {record.status === 'late' && <Clock size={14} color="#ca8a04" />}
                      {record.status === 'absent' && <X size={14} color="#dc2626" />}
                    </View>
                    <Text className="text-[10px] text-marble-500 font-bold">{format(new Date(record.date), 'MMM d')}</Text>
                  </View>
                ))}

                {/* Include Today's live status if checked */}
                {currentRecord && (
                  <View className="items-center w-10 mb-2">
                    <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 shadow-sm ${
                      currentRecord.status === 'present' ? 'bg-green-500' :
                      currentRecord.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      {currentRecord.status === 'present' && <Check size={14} color="#ffffff" />}
                      {currentRecord.status === 'late' && <Clock size={14} color="#ffffff" />}
                      {currentRecord.status === 'absent' && <X size={14} color="#ffffff" />}
                    </View>
                    <Text className="text-[10px] text-marble-900 font-black">Today</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Current Status Indicator Overlay */}
          {currentRecord && (
            <View className="absolute top-4 right-4 flex-row items-center bg-white border px-3 py-1.5 rounded-full shadow-sm"
              style={{
                borderColor: currentRecord.status === 'present' ? '#bbf7d0' : currentRecord.status === 'late' ? '#fef08a' : '#fecaca'
              }}
            >
              {currentRecord.status === 'present' && <Check size={12} color="#16a34a" />}
              {currentRecord.status === 'late' && <Clock size={12} color="#ca8a04" />}
              {currentRecord.status === 'absent' && <X size={12} color="#dc2626" />}
              <Text className={`text-xs font-bold ml-1 uppercase ${
                currentRecord.status === 'present' ? 'text-green-600' :
                currentRecord.status === 'late' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {currentRecord.status} Today
              </Text>
            </View>
          )}

        </View>

        {/* Action Buttons */}
        <View className="flex-row justify-between mb-2 gap-3">
          <TouchableOpacity 
            onPress={() => handleMark(currentStudent.id, 'absent')}
            className={`flex-1 py-4 rounded-2xl items-center shadow-sm border ${
              currentRecord?.status === 'absent' 
                ? 'bg-red-500 border-red-500' 
                : 'bg-white border-red-200'
            }`}
          >
            <X size={28} color={currentRecord?.status === 'absent' ? "#ffffff" : "#dc2626"} />
            <Text className={`font-bold mt-1 text-sm ${currentRecord?.status === 'absent' ? 'text-white' : 'text-red-600'}`}>Absent</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(currentStudent.id, 'late')}
            className={`flex-1 py-4 rounded-2xl items-center shadow-sm border ${
              currentRecord?.status === 'late' 
                ? 'bg-yellow-500 border-yellow-500' 
                : 'bg-white border-yellow-200'
            }`}
          >
            <Clock size={28} color={currentRecord?.status === 'late' ? "#ffffff" : "#ca8a04"} />
            <Text className={`font-bold mt-1 text-sm ${currentRecord?.status === 'late' ? 'text-white' : 'text-yellow-600'}`}>Late</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(currentStudent.id, 'present')}
            className={`flex-1 py-4 rounded-2xl items-center shadow-sm border ${
              currentRecord?.status === 'present' 
                ? 'bg-green-500 border-green-500' 
                : 'bg-white border-green-200'
            }`}
          >
            <Check size={28} color={currentRecord?.status === 'present' ? "#ffffff" : "#16a34a"} />
            <Text className={`font-bold mt-1 text-sm ${currentRecord?.status === 'present' ? 'text-white' : 'text-green-600'}`}>Present</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mt-2 px-2">
            <TouchableOpacity onPress={handlePrevious} disabled={currentIndex === 0} className={`flex-row items-center p-2 ${currentIndex === 0 ? 'opacity-30' : 'opacity-100'}`}>
              <ChevronLeft size={20} color="#97A6A0" />
              <Text className="text-marble-500 font-semibold ml-1">Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} className="flex-row items-center p-2">
              <Text className="text-marble-500 font-semibold mr-1">Skip</Text>
              <ChevronRight size={20} color="#97A6A0" />
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
