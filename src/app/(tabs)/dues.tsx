import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useDatabase, StudentModel, FeeModel } from '../../database/queries';
import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { AlertCircle, CheckCircle2, ChevronRight, User, Phone } from 'lucide-react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import * as Linking from 'expo-linking';

type DueRecord = {
  student: StudentModel;
  className: string;
  monthsDue: string[];
  totalDue: number;
};

export default function DuesTabScreen() {
  const { getAllStudents, calculateOverdueFees, assignFee, getClasses } = useDatabase();
  
  const [dueRecords, setDueRecords] = useState<DueRecord[]>([]);
  const [globalTotalDue, setGlobalTotalDue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    
    const classes = await getClasses();
    const classMap = classes.reduce((acc, cls) => {
      acc[cls.id] = cls.name;
      return acc;
    }, {} as Record<string, string>);

    const students = await getAllStudents();
    
    let total = 0;
    const records: DueRecord[] = [];

    for (const student of students) {
      const dueInfo = await calculateOverdueFees(student.id);
      if (dueInfo.totalDue > 0 && dueInfo.monthsDue.length > 0) {
        records.push({
          student,
          className: classMap[student.class_id] || 'Unknown Class',
          monthsDue: dueInfo.monthsDue,
          totalDue: dueInfo.totalDue
        });
        total += dueInfo.totalDue;
      }
    }

    // Sort by largest due amount first
    records.sort((a, b) => b.totalDue - a.totalDue);

    setDueRecords(records);
    setGlobalTotalDue(total);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getDueDateDisplay = (student: StudentModel, monthStr: string) => {
    const startDateStr = student.fees_start_date || (student.join_month + '-01');
    let startDay = 1;
    if (startDateStr && startDateStr.length >= 10) {
      startDay = parseInt(startDateStr.substring(8, 10)) || 1;
    }
    const year = parseInt(monthStr.substring(0, 4));
    const month = parseInt(monthStr.substring(5, 7)) - 1;
    const dueDate = new Date(year, month, startDay);
    return format(dueDate, 'd MMM yyyy');
  };

  const handleCall = (record: DueRecord) => {
    const { student } = record;
    const phone = student.parent_phone || student.phone || student.whatsapp_parent || student.whatsapp_student;
    
    if (!phone) {
      Alert.alert('No Number', 'This student has no saved phone numbers.');
      return;
    }

    Linking.openURL(`tel:${phone}`);
  };

  const handleRemind = (record: DueRecord) => {
    const { student, totalDue, monthsDue } = record;
    const phone = student.whatsapp_parent || student.whatsapp_student || student.phone || student.parent_phone;
    
    if (!phone) {
      Alert.alert('No Number', 'This student has no saved phone numbers.');
      return;
    }

    const monthNames = monthsDue.map(m => format(parseISO(`${m}-01`), 'MMMM')).join(', ');
    const message = `Hello, this is a reminder for pending tuition fees of ₹${totalDue} for ${student.name} (Months: ${monthNames}). Please pay at your earliest convenience.`;
    
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
  };

  const handlePayMonth = (record: DueRecord, monthStr: string) => {
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
              student_id: record.student.id,
              class_id: record.student.class_id,
              month: monthStr,
              amount: record.student.monthly_fee || 0,
              status: 'paid',
              payment_date: new Date().toISOString(),
            };
            await assignFee(newRecord);
            loadData();
          }
        }
      ]
    );
  };

  const handlePayAll = (record: DueRecord) => {
    Alert.alert(
      "Pay All Dues",
      `Mark all ${record.monthsDue.length} pending months (₹${record.totalDue}) as paid?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Pay All", 
          onPress: async () => {
            for (const monthStr of record.monthsDue) {
              const newRecord: FeeModel = {
                id: uuidv4(),
                student_id: record.student.id,
                class_id: record.student.class_id,
                month: monthStr,
                amount: record.student.monthly_fee || 0,
                status: 'paid',
                payment_date: new Date().toISOString(),
              };
              await assignFee(newRecord);
            }
            loadData();
          }
        }
      ]
    );
  };

  const renderDueItem = ({ item }: { item: DueRecord }) => {
    return (
      <View className="bg-rose-50 p-4 rounded-[24px] mb-4 border border-rose-100 shadow-md mx-4">
        <TouchableOpacity 
          onPress={() => router.push(`/student/${item.student.id}`)}
          className="flex-row items-center justify-between mb-4 bg-white p-3 rounded-[20px] shadow-sm"
        >
          <View className="flex-row items-center flex-1">
            <View className="bg-rose-100 w-12 h-12 rounded-full items-center justify-center mr-3">
              <User size={20} color="#e11d48" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-rose-900">{item.student.name}</Text>
              <Text className="text-rose-600 font-bold text-xs mt-0.5">{item.className}</Text>
            </View>
            <View className="items-end mr-2">
              <Text className="text-rose-700 font-black text-lg">₹{item.totalDue}</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#e11d48" style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        <View className="bg-white/60 p-3 rounded-2xl mb-4 border border-white/50">
          <Text className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 ml-1">Tap month to mark paid</Text>
          <View className="flex-row flex-wrap gap-2">
            {item.monthsDue.map(m => (
              <TouchableOpacity 
                key={m} 
                onPress={() => handlePayMonth(item, m)}
                className="bg-white border border-rose-200 px-3 py-1.5 rounded-xl shadow-sm"
              >
                <Text className="text-rose-700 text-sm font-bold">{getDueDateDisplay(item.student, m)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => handleCall(item)}
            className="w-14 h-14 bg-blue-500 rounded-[20px] items-center justify-center shadow-md"
          >
            <Phone size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleRemind(item)}
            className="w-14 h-14 bg-emerald-500 rounded-[20px] items-center justify-center shadow-md"
          >
            <FontAwesome name="whatsapp" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handlePayAll(item)}
            className="flex-1 bg-rose-600 h-14 rounded-[20px] flex-row justify-center items-center shadow-md"
          >
            <CheckCircle2 size={20} color="#ffffff" />
            <Text className="text-white font-black tracking-wide ml-2 text-sm uppercase">Pay All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      <View className="bg-rose-500 pt-16 pb-12 px-6 rounded-b-[40px] shadow-lg z-10 flex-row justify-between items-end">
        <View>
          <View className="flex-row items-center mb-2">
            <AlertCircle size={20} color="#ffe4e6" />
            <Text className="text-rose-100 text-sm font-bold ml-2 tracking-wide uppercase">Overdue Fees</Text>
          </View>
          <Text className="text-5xl font-black text-white tracking-tight">₹{globalTotalDue}</Text>
        </View>
        <View className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 mb-2">
          <Text className="text-white font-bold">{dueRecords.length} Students</Text>
        </View>
      </View>

      <FlatList
        className="-mt-6 z-0"
        data={dueRecords}
        keyExtractor={(item) => item.student.id}
        renderItem={renderDueItem}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <View className="bg-green-100 w-24 h-24 rounded-full items-center justify-center mb-4">
              <CheckCircle2 size={48} color="#16a34a" />
            </View>
            <Text className="text-2xl font-bold text-marble-900 mb-2">All Cleared!</Text>
            <Text className="text-marble-500 text-center px-8 mt-1">No students currently have any overdue fees based on their cycle dates.</Text>
          </View>
        }
      />
    </View>
  );
}
