import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useDatabase, ClassModel, StudentModel, FeeModel } from '../../database/queries';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function FeesTabScreen() {
  const { getClasses, getAllStudents, getFeesByMonth, assignFee } = useDatabase();
  
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [feeRecords, setFeeRecords] = useState<Record<string, FeeModel>>({});
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = format(currentDate, 'yyyy-MM');
  const monthDisplay = format(currentDate, 'MMMM yyyy');

  const loadData = async () => {
    const classData = await getClasses();
    setClasses(classData);

    const studentData = await getAllStudents();
    setStudents(studentData);

    const records = await getFeesByMonth(monthStr);
    const recordsMap = records.reduce((acc, curr) => {
      acc[curr.student_id] = curr;
      return acc;
    }, {} as Record<string, FeeModel>);
    setFeeRecords(recordsMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [monthStr])
  );

  const toggleFeeStatus = async (student: StudentModel) => {
    const existing = feeRecords[student.id];
    const isPaid = existing?.status === 'paid';
    const newStatus = isPaid ? 'unpaid' : 'paid';

    const newRecord: FeeModel = {
      id: existing ? existing.id : uuidv4(),
      student_id: student.id,
      class_id: student.class_id,
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
    setExpandedClassId(prev => prev === classId ? null : classId);
  };

  const renderStudentItem = (student: StudentModel) => {
    const record = feeRecords[student.id];
    const isPaid = record?.status === 'paid';

    return (
      <View key={student.id} className="bg-white p-4 rounded-xl mb-3 border border-marble-200 shadow-sm mx-2 flex-row items-center justify-between">
        <TouchableOpacity className="flex-1" onPress={() => router.push(`/student/${student.id}`)}>
          <Text className="text-lg font-bold text-marble-900">{student.name}</Text>
          <Text className="text-marble-500 text-sm mt-0.5">₹{student.monthly_fee || 0} / month</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => toggleFeeStatus(student)}
          className={`flex-row items-center px-4 py-2 rounded-full border ${
            isPaid ? 'bg-green-500 border-green-500' : 'bg-gray-100 border-gray-200'
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle2 size={18} color="#ffffff" />
              <Text className="ml-2 font-bold text-white">Paid</Text>
            </>
          ) : (
            <>
              <Circle size={18} color="#6b7280" />
              <Text className="ml-2 font-bold text-gray-500">Unpaid</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderClassAccordion = ({ item: cls }: { item: ClassModel }) => {
    const isExpanded = expandedClassId === cls.id;
    const classStudents = studentsByClass[cls.id] || [];
    
    const paidCount = classStudents.filter(s => feeRecords[s.id]?.status === 'paid').length;
    const totalExpected = classStudents.reduce((sum, s) => sum + (s.monthly_fee || 0), 0);
    const totalCollected = classStudents.filter(s => feeRecords[s.id]?.status === 'paid').reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

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
            <Text className={`text-sm mt-0.5 ${isExpanded ? 'text-marble-300' : 'text-marble-500'}`}>₹{totalCollected} / ₹{totalExpected} collected</Text>
          </View>
          <View className="flex-row items-center">
            {isExpanded ? <ChevronUp size={24} color="#ffffff" /> : <ChevronDown size={24} color="#97A6A0" />}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View className="bg-marble-100/50 mx-4 pt-4 pb-2 px-2 rounded-b-2xl border border-t-0 border-marble-200">
            {/* Sub-header block */}
            <View className="bg-white p-4 rounded-xl mb-4 flex-row justify-between items-center shadow-sm">
              <View>
                <Text className="text-marble-500 text-sm">Status</Text>
                <Text className="text-marble-900 font-bold">{monthDisplay}</Text>
              </View>
              <View className="items-end">
                <Text className="text-marble-500 text-sm">Paid</Text>
                <Text className="text-marble-800 font-bold text-lg">{paidCount} / {classStudents.length}</Text>
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
      {/* Month Selector Header */}
      <View className="bg-white pt-14 pb-4 px-4 shadow-sm z-10 border-b border-marble-100">
        <View className="flex-row items-center justify-between bg-marble-50 rounded-xl p-2 border border-marble-200">
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <ChevronLeft size={24} color="#387373" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-marble-900">
            {monthDisplay}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2">
            <ChevronRight size={24} color="#387373" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={classes}
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
