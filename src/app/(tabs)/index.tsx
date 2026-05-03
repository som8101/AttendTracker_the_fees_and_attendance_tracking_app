import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase, ClassModel } from '../../database/queries';
import { useEffect, useState, useCallback } from 'react';
import { Users, GraduationCap, CheckCircle2, DollarSign, Wallet, Book, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { getDashboardSummary, getClasses } = useDatabase();
  const [summary, setSummary] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayAttendance: [] as any[],
    pendingFees: 0,
    expectedFees: 0,
    paidFees: 0,
  });
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
      const classData = await getClasses();
      setClasses(classData);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const presentCount = summary.todayAttendance.find((a) => a.status === 'present')?.count || 0;

  return (
    <ScrollView 
      className="flex-1 bg-marble-50"
      contentContainerStyle={{ padding: 24, paddingTop: Math.max(insets.top + 16, 40), paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="mb-8 flex-row justify-between items-center">
        <View>
          <Text className="text-base font-medium text-marble-500 mb-1">Welcome back,</Text>
          <Text className="text-3xl font-bold text-marble-900 tracking-tight">Shamiran Sir</Text>
        </View>
        <View className="bg-marble-700 w-14 h-14 rounded-full items-center justify-center border-[3px] border-white shadow-sm">
          <Text className="text-white text-xl font-bold">S</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-4">
        {/* Classes Card */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/classes')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <GraduationCap size={24} color="#387373" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Classes</Text>
            <Text className="text-2xl font-semibold text-marble-900">{summary.totalClasses}</Text>
          </View>
        </TouchableOpacity>

        {/* Students Card */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/classes')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <Users size={24} color="#387373" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Students</Text>
            <Text className="text-2xl font-semibold text-marble-900">{summary.totalStudents}</Text>
          </View>
        </TouchableOpacity>

        {/* Present Today Card */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/attendance')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <CheckCircle2 size={24} color="#387373" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Present Today</Text>
            <Text className="text-2xl font-semibold text-marble-900">{presentCount}</Text>
          </View>
        </TouchableOpacity>

        {/* Pending Fees Card */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/fees')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <DollarSign size={24} color="#387373" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Pending Fees</Text>
            <Text className="text-2xl font-semibold text-marble-900">{summary.pendingFees}</Text>
          </View>
        </TouchableOpacity>

        {/* Total Expected Fees */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/fees')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <Wallet size={24} color="#93BFB7" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Total Fees</Text>
            <Text className="text-xl font-semibold text-marble-900">₹{summary.expectedFees}</Text>
          </View>
        </TouchableOpacity>

        {/* Total Paid Fees */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/fees')}
          className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-marble-100 flex-row items-center"
        >
          <View className="bg-marble-50 w-12 h-12 rounded-2xl items-center justify-center mr-3">
            <Wallet size={24} color="#2D3E40" />
          </View>
          <View>
            <Text className="text-marble-500 text-sm font-medium mb-1">Paid (Month)</Text>
            <Text className="text-xl font-semibold text-marble-900">₹{summary.paidFees}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View className="mt-8">
        <Text className="text-xl font-bold text-marble-900 mb-4">Recent Classes</Text>
        {classes.length === 0 ? (
          <Text className="text-marble-400 italic">No recent classes yet.</Text>
        ) : (
          classes.slice(0, 3).map((item) => (
            <TouchableOpacity 
              key={item.id}
              onPress={() => router.push(`/class/${item.id}`)}
              className="bg-white p-4 rounded-xl mb-3 flex-row items-center justify-between border border-marble-100 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="bg-marble-50 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Book size={20} color="#387373" />
                </View>
                <View>
                  <Text className="text-lg font-semibold text-marble-900">{item.name}</Text>
                  {item.timing && <Text className="text-marble-400 text-xs mt-1">{item.timing}</Text>}
                </View>
              </View>
              <ChevronRight size={20} color="#97A6A0" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
