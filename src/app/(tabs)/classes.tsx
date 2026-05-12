import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Platform, Alert, ScrollView } from 'react-native';
import { useDatabase, ClassModel } from '../../database/queries';
import { useState, useCallback } from 'react';
import { Plus, Book, ChevronRight, X, Clock, Trash2 } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { checkScheduleOverlap } from '../../utils/schedule';

export default function ClassesScreen() {
  const { getClasses, addClass, deleteClass } = useDatabase();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const CARD_COLORS = [
    'bg-emerald-100 border-emerald-100',
    'bg-blue-100 border-blue-200',
    'bg-purple-100 border-purple-200',
    'bg-orange-100 border-orange-200',
    'bg-rose-100 border-rose-200',
    'bg-amber-100 border-amber-200'
  ];

  const TEXT_COLORS = [
    'text-emerald-900',
    'text-blue-900',
    'text-purple-900',
    'text-orange-900',
    'text-rose-900',
    'text-amber-900'
  ];

  // New Class Form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');

  // Time Picker State
  const [dayTimings, setDayTimings] = useState<Record<number, { start: Date, end: Date }>>({});
  const [showPicker, setShowPicker] = useState<{ day: number, type: 'start' | 'end' } | null>(null);

  const getDayTiming = (dayIdx: number) => {
    return dayTimings[dayIdx] || {
      start: new Date(new Date().setHours(9, 0, 0, 0)),
      end: new Date(new Date().setHours(10, 0, 0, 0))
    };
  };

  // Schedule State
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Default Mon-Sat
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const loadClasses = async () => {
    const data = await getClasses();
    setClasses(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const handleAddClass = async () => {
    if (!name.trim()) return;

    const scheduleArray = selectedDays.map(dayIdx => {
      const timing = getDayTiming(dayIdx);
      return {
        day: dayIdx,
        startTime: format(timing.start, 'h:mm a'),
        endTime: format(timing.end, 'h:mm a')
      };
    });

    const overlapError = checkScheduleOverlap(scheduleArray, classes);
    if (overlapError) {
      Alert.alert('Schedule Conflict', overlapError);
      return;
    }

    await addClass({
      id: uuidv4(),
      name,
      subject: subject || null,
      timing: null,
      days_of_week: selectedDays.sort().join(','),
      weekly_schedule: JSON.stringify(scheduleArray)
    });

    setName('');
    setSubject('');
    setSelectedDays([1, 2, 3, 4, 5, 6]);
    setDayTimings({});
    setModalVisible(false);
    loadClasses();
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showPicker;
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }

    if (selectedDate && currentPicker) {
      setDayTimings(prev => {
        const currentTiming = getDayTiming(currentPicker.day);
        return {
          ...prev,
          [currentPicker.day]: {
            ...currentTiming,
            [currentPicker.type]: selectedDate
          }
        };
      });
    }
  };

  const handleDeleteClass = (id: string, name: string) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete "${name}"? This will also remove all associated students and records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteClass(id);
            loadClasses();
          }
        }
      ]
    );
  };

  const renderClassItem = ({ item, index }: { item: ClassModel, index: number }) => {
    const colorClass = CARD_COLORS[index % CARD_COLORS.length];
    const textClass = TEXT_COLORS[index % TEXT_COLORS.length];

    return (
      <TouchableOpacity
        onPress={() => router.push(`/class/${item.id}`)}
        className={`${colorClass} flex-1 p-5 rounded-[32px] m-2 border shadow-sm aspect-square justify-between`}
      >
        <View className="flex-row justify-between items-start">
          <View className="bg-white/50 p-3 rounded-full">
            <Book size={24} color="#2D3E40" />
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteClass(item.id, item.name)}
            className="p-2 bg-white/40 rounded-full"
          >
            <Trash2 size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className={`text-xl font-black ${textClass} mb-1`} numberOfLines={2}>{item.name}</Text>
          {item.subject && <Text className={`${textClass} opacity-80 text-sm font-bold mb-2`}>{item.subject}</Text>}
          <View className="flex-row items-center">
            <Clock size={12} color="#2D3E40" style={{ opacity: 0.6 }} />
            <Text className={`${textClass} opacity-70 text-xs ml-1 font-medium`}>
              {item.days_of_week ? item.days_of_week.split(',').length : 0} days/week
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Custom Header */}
      <View className="bg-emerald-500 pt-16 pb-8 px-6 rounded-b-[40px] z-10 shadow-lg">
        <Text className="text-3xl font-black text-white">My Classes</Text>
        <Text className="text-emerald-100 font-bold mt-1">{classes.length} Total Classes</Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClassItem}
        numColumns={2}
        className="-mt-4 z-0"
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 24, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Book size={48} color="#97A6A0" />
            <Text className="text-marble-500 mt-4 text-lg">No classes yet</Text>
            <Text className="text-marble-400 text-sm">Tap the + button to add one</Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 right-6 bg-emerald-600 w-16 h-16 rounded-full items-center justify-center shadow-lg border-4 border-emerald-100"
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-blue-900">Add New Class</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setShowPicker(null);
              }}
              className="bg-blue-50 p-2 rounded-full"
              >
                <X size={24} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-blue-800 mb-1 uppercase tracking-wider">Class Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. 10th Grade Math"
                className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-blue-900 text-lg font-bold"
                placeholderTextColor="#3b82f6"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-blue-800 mb-1 uppercase tracking-wider">Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Mathematics"
                className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-blue-900 text-lg font-bold"
                placeholderTextColor="#3b82f6"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-blue-800 mb-3 uppercase tracking-wider">Class Days</Text>
              <View className="flex-row justify-between">
                {DAYS.map((day, idx) => {
                  const isSelected = selectedDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setSelectedDays(prev =>
                          prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={`w-11 h-11 rounded-full items-center justify-center border-2 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-blue-50 border-blue-100'
                        }`}
                    >
                      <Text className={`font-black text-base ${isSelected ? 'text-white' : 'text-blue-400'}`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dynamic Timings */}
            <ScrollView className="max-h-60 mb-4" showsVerticalScrollIndicator={false}>
              {selectedDays.sort().map(dayIdx => {
                const timing = getDayTiming(dayIdx);
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx];
                return (
                  <View key={dayIdx} className="mb-4">
                    <Text className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">{dayName} Timing</Text>
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() => setShowPicker({ day: dayIdx, type: 'start' })}
                        className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={18} color="#2563eb" className="mr-2" />
                        <Text className="text-blue-900 font-bold text-base">{format(timing.start, 'h:mm a')}</Text>
                      </TouchableOpacity>

                      <Text className="mx-3 text-blue-300 font-black">-</Text>

                      <TouchableOpacity
                        onPress={() => setShowPicker({ day: dayIdx, type: 'end' })}
                        className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={18} color="#2563eb" className="mr-2" />
                        <Text className="text-blue-900 font-bold text-base">{format(timing.end, 'h:mm a')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {showPicker && (
              <DateTimePicker
                value={getDayTiming(showPicker.day)[showPicker.type]}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}

            <TouchableOpacity
              onPress={handleAddClass}
              className={`p-5 rounded-2xl items-center shadow-md mt-2 ${name.trim() ? 'bg-blue-600' : 'bg-blue-300'}`}
              disabled={!name.trim()}
            >
              <Text className="text-white font-black text-xl tracking-wide">Save Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
