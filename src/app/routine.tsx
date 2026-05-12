import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarDays, Clock, MapPin } from 'lucide-react-native';
import { useDatabase, ClassModel } from '../database/queries';
import { parse, startOfWeek, addDays, format } from 'date-fns';

type ScheduleItem = {
  day: number;
  startTime: string;
  endTime: string;
};

type RoutineEntry = {
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  colorIndex: number;
  isExtra?: boolean;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Ensure consistent vibrant colors
const COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-200', icon: '#059669', timeBg: 'bg-emerald-200/50' },
  { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200', icon: '#2563eb', timeBg: 'bg-blue-200/50' },
  { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-200', icon: '#7c3aed', timeBg: 'bg-purple-200/50' },
  { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200', icon: '#ea580c', timeBg: 'bg-orange-200/50' },
  { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-200', icon: '#e11d48', timeBg: 'bg-rose-200/50' },
];

function parseTime(timeStr: string): number {
  try {
    const [time, period] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch (e) {
    const date = parse(timeStr, 'h:mm a', new Date());
    return date.getHours() * 60 + date.getMinutes();
  }
}

export default function RoutineScreen() {
  const router = useRouter();
  const { getClasses, getExtraClassesByDate } = useDatabase();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [extraClassesMap, setExtraClassesMap] = useState<Record<number, RoutineEntry[]>>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  });
  const [activeDay, setActiveDay] = useState(new Date().getDay());
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const data = await getClasses();
    setClasses(data);

    // Load extra classes for the current week
    const today = new Date();
    const sunday = startOfWeek(today);
    
    const extraMap: Record<number, RoutineEntry[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(sunday, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const extras = await getExtraClassesByDate(dateStr);
      
      extras.forEach((ex: any) => {
        const cls = data.find(c => c.id === ex.class_id);
        if (cls) {
          const [startTime, endTime] = ex.timing.split(' - ');
          // Assign a unique color index for extra classes (e.g. 2 for purple)
          const colorIdx = 2; 
          extraMap[i].push({
            classId: cls.id,
            className: cls.name,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            startMinutes: parseTime(startTime),
            colorIndex: colorIdx,
            isExtra: true
          });
        }
      });
    }
    setExtraClassesMap(extraMap);
  };

  // Group classes by day and sort chronologically
  const routineByDay = useMemo(() => {
    const grouped: Record<number, RoutineEntry[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    classes.forEach((cls, idx) => {
      if (cls.weekly_schedule) {
        try {
          const schedule: ScheduleItem[] = JSON.parse(cls.weekly_schedule);
          schedule.forEach((item) => {
            grouped[item.day].push({
              classId: cls.id,
              className: cls.name,
              startTime: item.startTime,
              endTime: item.endTime,
              startMinutes: parseTime(item.startTime),
              colorIndex: idx % COLORS.length,
            });
          });
        } catch (e) {
          console.error('Failed to parse schedule for class', cls.id);
        }
      }
    });

    // Merge extra classes and sort each day chronologically
    for (let day = 0; day < 7; day++) {
      if (extraClassesMap[day]) {
        grouped[day].push(...extraClassesMap[day]);
      }
      grouped[day].sort((a, b) => a.startMinutes - b.startMinutes);
    }

    return grouped;
  }, [classes, extraClassesMap]);

  // Handle auto-scroll to current day pill
  useEffect(() => {
    if (scrollViewRef.current) {
      const screenWidth = Dimensions.get('window').width;
      const itemWidth = 70; // approximate width of a day pill
      // Center the active day
      scrollViewRef.current.scrollTo({
        x: Math.max(0, activeDay * itemWidth - screenWidth / 2 + itemWidth / 2),
        animated: true
      });
    }
  }, [activeDay]);

  const activeClasses = routineByDay[activeDay];

  return (
    <View className="flex-1 bg-marble-50">
      {/* Header */}
      <View className="bg-emerald-500 pt-16 pb-6 px-6 rounded-b-[40px] shadow-sm z-20">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 p-2 rounded-full border border-white/30">
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text className="text-3xl font-black text-white tracking-tight">Routine</Text>
            <Text className="text-emerald-100 font-medium mt-1">Weekly Schedule</Text>
          </View>
        </View>

        {/* Day Selector */}
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {SHORT_DAYS.map((dayName, idx) => {
            const isActive = activeDay === idx;
            const hasClasses = routineByDay[idx].length > 0;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveDay(idx)}
                className={`items-center justify-center px-4 py-3 mx-1 rounded-2xl border ${
                  isActive 
                    ? 'bg-white border-white' 
                    : 'bg-emerald-600 border-emerald-400'
                }`}
              >
                <Text className={`font-black text-lg ${isActive ? 'text-emerald-600' : 'text-white'}`}>
                  {dayName}
                </Text>
                {hasClasses && (
                  <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isActive ? 'bg-emerald-500' : 'bg-white'}`} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Routine List */}
      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-black text-emerald-900 mb-6 ml-2">
          {DAYS[activeDay]} <Text className="text-marble-400 font-medium text-lg">({activeClasses.length} Classes)</Text>
        </Text>

        {activeClasses.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <View className="w-24 h-24 bg-emerald-100 rounded-full items-center justify-center mb-6 border-4 border-white shadow-sm">
              <CalendarDays size={40} color="#059669" />
            </View>
            <Text className="text-2xl font-black text-emerald-900 mb-2">Free Day!</Text>
            <Text className="text-marble-500 font-medium text-center px-8">
              You have no classes scheduled for {DAYS[activeDay]}. Enjoy your time off!
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {activeClasses.map((item, idx) => {
              const color = COLORS[item.colorIndex];
              return (
                <TouchableOpacity
                  key={`${item.classId}-${idx}`}
                  onPress={() => router.push(`/class/${item.classId}`)}
                  className={`flex-row ${color.bg} rounded-3xl p-5 border ${color.border} shadow-sm`}
                >
                  {/* Timeline Indicator */}
                  <View className="items-center mr-5">
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center ${color.timeBg}`}>
                      <Clock size={20} color={color.icon} />
                    </View>
                    {idx !== activeClasses.length - 1 && (
                      <View className="w-0.5 h-12 bg-white/50 mt-2 rounded-full" />
                    )}
                  </View>

                  {/* Class Info */}
                  <View className="flex-1 justify-center">
                    <View className="flex-row items-center mb-1">
                      <Text className={`text-xl font-black ${color.text} flex-shrink`}>
                        {item.className}
                      </Text>
                      {item.isExtra && (
                        <View className="bg-purple-200 px-2 py-0.5 rounded-md ml-2 border border-purple-300">
                          <Text className="text-purple-800 text-xs font-bold uppercase">Extra</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      <Text className={`font-bold ${color.text} opacity-80 text-base`}>
                        {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
