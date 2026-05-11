import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase, ClassModel } from '../../database/queries';
import { useEffect, useState, useCallback } from 'react';
import { Users, GraduationCap, CheckCircle2, DollarSign, Wallet, Book, ChevronRight, CalendarDays } from 'lucide-react-native';
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

  const CARD_COLORS = [
    'bg-emerald-100 border-emerald-100',
    'bg-blue-100 border-blue-100',
    'bg-purple-100 border-purple-100',
    'bg-orange-100 border-orange-100',
    'bg-rose-100 border-rose-100',
    'bg-amber-100 border-amber-100'
  ];

  const TEXT_COLORS = [
    'text-emerald-900',
    'text-blue-900',
    'text-purple-900',
    'text-orange-900',
    'text-rose-900',
    'text-amber-900'
  ];


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
    <View className="flex-1 bg-marble-50">
      {/* Vibrant Header */}
      <View className="bg-emerald-500 pt-16 pb-10 px-6 rounded-b-[40px] flex-row justify-between items-start z-0">
        <View>
          <Text className="text-emerald-100 font-medium mb-1">Welcome back,</Text>
          <Text className="text-3xl font-black text-white tracking-tight">Samiran Sir</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/profile')}
          className="bg-white/20 w-14 h-14 rounded-full items-center justify-center border-2 border-white/40 shadow-sm mt-1"
        >
          <Text className="text-white text-xl font-bold">S</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 -mt-8 z-20"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row flex-wrap justify-between gap-y-4 pt-2">
          {/* Classes Card */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/classes')}
            className="w-[48%] bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-blue-100 w-10 h-10 rounded-xl items-center justify-center border border-blue-200/50">
                <GraduationCap size={20} color="#2563eb" />
              </View>
              <Text className="text-2xl font-black text-blue-900">{summary.totalClasses}</Text>
            </View>
            <Text className="text-blue-700 text-sm font-bold">Classes</Text>
          </TouchableOpacity>

          {/* Students Card */}
          <TouchableOpacity
            onPress={() => router.push('/students')}
            className="w-[48%] bg-purple-50 p-4 rounded-2xl shadow-sm border border-purple-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-purple-100 w-10 h-10 rounded-xl items-center justify-center border border-purple-200/50">
                <Users size={20} color="#7c3aed" />
              </View>
              <Text className="text-2xl font-black text-purple-900">{summary.totalStudents}</Text>
            </View>
            <Text className="text-purple-700 text-sm font-bold">Students</Text>
          </TouchableOpacity>

          {/* Present Today Card */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/attendance')}
            className="w-[48%] bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-emerald-100 w-10 h-10 rounded-xl items-center justify-center border border-emerald-200/50">
                <CheckCircle2 size={20} color="#059669" />
              </View>
              <Text className="text-2xl font-black text-emerald-900">{presentCount}</Text>
            </View>
            <Text className="text-emerald-700 text-sm font-bold">Present Today</Text>
          </TouchableOpacity>

          {/* Pending Fees Card */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/dues')}
            className="w-[48%] bg-rose-50 p-4 rounded-2xl shadow-sm border border-rose-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-rose-100 w-10 h-10 rounded-xl items-center justify-center border border-rose-200/50">
                <DollarSign size={20} color="#e11d48" />
              </View>
              <Text className="text-2xl font-black text-rose-900">{summary.pendingFees}</Text>
            </View>
            <Text className="text-rose-700 text-sm font-bold">Pending Dues</Text>
          </TouchableOpacity>

          {/* Total Expected Fees */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/fees')}
            className="w-[48%] bg-amber-50 p-4 rounded-2xl shadow-sm border border-amber-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-amber-100 w-10 h-10 rounded-xl items-center justify-center border border-amber-200/50">
                <Wallet size={20} color="#d97706" />
              </View>
              <Text className="text-xl font-black text-amber-900">₹{summary.expectedFees}</Text>
            </View>
            <Text className="text-amber-700 text-sm font-bold">Total Expected</Text>
          </TouchableOpacity>

          {/* Total Paid Fees */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/fees')}
            className="w-[48%] bg-cyan-50 p-4 rounded-2xl shadow-sm border border-cyan-200 flex-col"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="bg-cyan-100 w-10 h-10 rounded-xl items-center justify-center border border-cyan-200/50">
                <Wallet size={20} color="#0891b2" />
              </View>
              <Text className="text-xl font-black text-cyan-900">₹{summary.paidFees}</Text>
            </View>
            <Text className="text-cyan-700 text-sm font-bold">Collected</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <Text className="text-xl font-bold text-marble-900 mb-4">Recent Classes</Text>
          {classes.length === 0 ? (
            <Text className="text-marble-400 italic">No recent classes yet.</Text>
          ) : (
            classes.slice(0, 3).map((item, index) => {
              const bgColor = CARD_COLORS[index % CARD_COLORS.length];
              const textColor = TEXT_COLORS[index % TEXT_COLORS.length];
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/class/${item.id}`)}
                  className={`${bgColor} p-4 rounded-2xl mb-3 flex-row items-center justify-between shadow-sm border`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="bg-white/60 w-12 h-12 rounded-full items-center justify-center mr-4">
                      <Book size={20} color="#2D3E40" />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-lg font-black ${textColor}`}>{item.name}</Text>
                      {item.timing && <Text className={`${textColor} opacity-80 text-xs mt-1 font-bold`}>{item.timing}</Text>}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#2D3E40" style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Routine FAB */}
      <TouchableOpacity
        onPress={() => router.push('/routine')}
        className="absolute bottom-6 right-6 bg-emerald-500 w-16 h-16 rounded-full items-center justify-center shadow-lg border-2 border-emerald-400 z-50 flex-row"
        style={{ shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
      >
        <CalendarDays size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
