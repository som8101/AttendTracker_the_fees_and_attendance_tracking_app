import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Platform, Alert, ScrollView } from 'react-native';
import { useDatabase, ClassModel } from '../../database/queries';
import { useState, useCallback } from 'react';
import { Plus, Book, ChevronRight, X, Clock, Trash2 } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function ClassesScreen() {
  const { getClasses, addClass, deleteClass } = useDatabase();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

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

  const renderClassItem = ({ item }: { item: ClassModel }) => (
    <TouchableOpacity
      onPress={() => router.push(`/class/${item.id}`)}
      className="bg-white p-4 rounded-xl mb-3 flex-row items-center justify-between border border-marble-50 shadow-sm"
    >
      <View className="flex-row items-center">
        <View className="bg-marble-50 w-12 h-12 rounded-full items-center justify-center mr-4">
          <Book size={20} color="#387373" />
        </View>
        <View>
          <Text className="text-lg font-semibold text-marble-900">{item.name}</Text>
          {item.subject && <Text className="text-marble-500 text-sm mt-0.5">{item.subject}</Text>}
          <View className="flex-row items-center mt-1">
            <Clock size={12} color="#97A6A0" />
            <Text className="text-marble-400 text-xs ml-1">
              Scheduled: {item.days_of_week ? item.days_of_week.split(',').length : 0} days/week
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => handleDeleteClass(item.id, item.name)}
          className="p-2 bg-red-50 rounded-full"
        >
          <Trash2 size={18} color="#dc2626" />
        </TouchableOpacity>
        <ChevronRight size={20} color="#97A6A0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-marble-50 p-4">
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClassItem}
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
        className="absolute bottom-6 right-6 bg-marble-700 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={24} color="#ffffff" />
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
              <Text className="text-xl font-bold text-marble-900">Add New Class</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setShowPicker(null);
              }}>
                <X size={24} color="#97A6A0" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-1">Class Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. 10th Grade Math"
                className="bg-marble-50 border border-marble-200 rounded-xl p-4 text-marble-900 text-base"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-1">Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Mathematics"
                className="bg-marble-50 border border-marble-200 rounded-xl p-4 text-marble-900 text-base"
                placeholderTextColor="#97A6A0"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-marble-700 mb-2">Class Days</Text>
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
                      className={`w-10 h-10 rounded-full items-center justify-center border ${isSelected ? 'bg-marble-700 border-marble-700' : 'bg-marble-50 border-marble-200'
                        }`}
                    >
                      <Text className={`font-bold ${isSelected ? 'text-white' : 'text-marble-500'}`}>
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
                    <Text className="text-sm font-medium text-marble-700 mb-2">{dayName} Timing</Text>
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={() => setShowPicker({ day: dayIdx, type: 'start' })}
                        className="flex-1 bg-marble-50 border border-marble-200 rounded-xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={16} color="#387373" className="mr-2" />
                        <Text className="text-marble-900 font-medium">{format(timing.start, 'h:mm a')}</Text>
                      </TouchableOpacity>

                      <Text className="mx-3 text-marble-400 font-bold">-</Text>

                      <TouchableOpacity
                        onPress={() => setShowPicker({ day: dayIdx, type: 'end' })}
                        className="flex-1 bg-marble-50 border border-marble-200 rounded-xl p-4 flex-row items-center justify-center"
                      >
                        <Clock size={16} color="#387373" className="mr-2" />
                        <Text className="text-marble-900 font-medium">{format(timing.end, 'h:mm a')}</Text>
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
              className={`p-4 rounded-xl items-center shadow-sm ${name.trim() ? 'bg-marble-700' : 'bg-marble-400'}`}
              disabled={!name.trim()}
            >
              <Text className="text-white font-bold text-lg">Save Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
