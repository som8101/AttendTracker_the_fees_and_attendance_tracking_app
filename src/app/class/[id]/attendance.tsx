import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, AttendanceModel } from '../../../database/queries';
import { useState, useCallback } from 'react';
import { ArrowLeft, Check, X, Clock } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function AttendanceScreen() {
  const { id } = useLocalSearchParams();
  const classId = id as string;
  
  const { getStudentsByClass, getAttendanceByClassAndDate, markAttendance } = useDatabase();
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceModel>>({});
  
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
  };

  const renderStudentItem = ({ item }: { item: StudentModel }) => {
    const record = attendanceRecords[item.id];
    const status = record?.status;

    return (
      <View className="bg-white p-4 rounded-xl mb-3 border border-marble-100 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-marble-900">{item.name}</Text>
          {item.roll_number && <Text className="text-marble-500 text-sm">Roll: {item.roll_number}</Text>}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => handleMark(item.id, 'present')}
            className={`flex-1 flex-row justify-center items-center py-2 rounded-lg border ${
              status === 'present' ? 'bg-green-500 border-green-500' : 'bg-green-50 border-green-200'
            }`}
          >
            <Check size={18} color={status === 'present' ? '#fff' : '#16a34a'} />
            <Text className={`ml-1 font-medium ${status === 'present' ? 'text-white' : 'text-green-700'}`}>
              Present
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(item.id, 'late')}
            className={`flex-1 flex-row justify-center items-center py-2 rounded-lg border ${
              status === 'late' ? 'bg-yellow-500 border-yellow-500' : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <Clock size={18} color={status === 'late' ? '#fff' : '#ca8a04'} />
            <Text className={`ml-1 font-medium ${status === 'late' ? 'text-white' : 'text-yellow-700'}`}>
              Late
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleMark(item.id, 'absent')}
            className={`flex-1 flex-row justify-center items-center py-2 rounded-lg border ${
              status === 'absent' ? 'bg-red-500 border-red-500' : 'bg-red-50 border-red-200'
            }`}
          >
            <X size={18} color={status === 'absent' ? '#fff' : '#dc2626'} />
            <Text className={`ml-1 font-medium ${status === 'absent' ? 'text-white' : 'text-red-700'}`}>
              Absent
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#2D3E40" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-marble-900">Today's Attendance</Text>
          <Text className="text-marble-500 text-sm">{format(new Date(), 'EEEE, MMMM do yyyy')}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center mt-10">
            <Text className="text-marble-400 text-lg">No students to mark.</Text>
          </View>
        }
      />
    </View>
  );
}
