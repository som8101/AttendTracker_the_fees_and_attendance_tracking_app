import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDatabase, StudentModel, FeeModel } from '../../../database/queries';
import { useState, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { format, addMonths, subMonths } from 'date-fns';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function FeesScreen() {
  const { id } = useLocalSearchParams();
  const classId = id as string;
  
  const { getStudentsByClass, getFeesByClassAndMonth, assignFee } = useDatabase();
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [feeRecords, setFeeRecords] = useState<Record<string, FeeModel>>({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = format(currentDate, 'yyyy-MM');

  const loadData = async () => {
    const studentData = await getStudentsByClass(classId);
    setStudents(studentData);

    const records = await getFeesByClassAndMonth(classId, monthStr);
    const recordsMap = records.reduce((acc, curr) => {
      acc[curr.student_id] = curr;
      return acc;
    }, {} as Record<string, FeeModel>);
    setFeeRecords(recordsMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [classId, monthStr])
  );

  const toggleFeeStatus = async (student: StudentModel) => {
    const existing = feeRecords[student.id];
    const isPaid = existing?.status === 'paid';
    const newStatus = isPaid ? 'unpaid' : 'paid';

    const newRecord: FeeModel = {
      id: existing ? existing.id : uuidv4(),
      student_id: student.id,
      class_id: classId,
      month: monthStr,
      amount: student.monthly_fee || 0,
      status: newStatus,
      payment_date: newStatus === 'paid' ? new Date().toISOString() : null,
    };

    await assignFee(newRecord);
    
    setFeeRecords(prev => ({
      ...prev,
      [student.id]: newRecord
    }));
  };

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  const renderStudentItem = ({ item }: { item: StudentModel }) => {
    const record = feeRecords[item.id];
    const isPaid = record?.status === 'paid';

    return (
      <View className="bg-white p-4 rounded-xl mb-3 border border-marble-100 shadow-sm flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-marble-900">{item.name}</Text>
          <Text className="text-marble-500 text-sm">Amount: ₹{item.monthly_fee || 0}</Text>
        </View>

        <TouchableOpacity 
          onPress={() => toggleFeeStatus(item)}
          className={`flex-row items-center px-4 py-2 rounded-full border ${
            isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle2 size={18} color="#16a34a" />
              <Text className="ml-2 font-medium text-green-700">Paid</Text>
            </>
          ) : (
            <>
              <Circle size={18} color="#dc2626" />
              <Text className="ml-2 font-medium text-red-700">Unpaid</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#2D3E40" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-marble-900">Fee Management</Text>
          </View>
        </View>

        {/* Month Selector */}
        <View className="flex-row items-center justify-between bg-marble-50 rounded-xl p-2 border border-marble-100">
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <ChevronLeft size={24} color="#387373" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-marble-900">
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2">
            <ChevronRight size={24} color="#387373" />
          </TouchableOpacity>
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
            <Text className="text-marble-400 text-lg">No students in this class.</Text>
          </View>
        }
      />
    </View>
  );
}
