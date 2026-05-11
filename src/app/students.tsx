import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useDatabase, StudentModel, ClassModel } from '../database/queries';
import { useState, useCallback } from 'react';
import { ArrowLeft, User, Search, Users } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';

export default function AllStudentsScreen() {
  const { getAllStudents, getClasses } = useDatabase();
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    const data = await getAllStudents();
    setStudents(data);
    
    const classes = await getClasses();
    const map = classes.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {} as Record<string, string>);
    setClassesMap(map);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

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
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-600 text-xs font-bold bg-white/60 px-2 py-0.5 rounded-md mr-2">{classesMap[item.class_id] || 'Unknown Class'}</Text>
            {item.roll_number && <Text className="text-gray-600 text-xs font-medium bg-white/50 px-2 py-0.5 rounded-md mr-2">Roll: {item.roll_number}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      <View className="bg-emerald-100 pt-14 pb-8 px-4 shadow-sm z-10 flex-row items-center rounded-b-[32px] border-b border-emerald-200 mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/40 p-2 rounded-full">
          <ArrowLeft size={24} color="#064e3b" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-emerald-900">All Students</Text>
          <Text className="text-emerald-700 font-bold text-sm">{students.length} Total Enrolled</Text>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <Users size={48} color="#97A6A0" />
            <Text className="text-gray-500 font-bold mt-4 text-lg">No students yet</Text>
          </View>
        }
      />
    </View>
  );
}
