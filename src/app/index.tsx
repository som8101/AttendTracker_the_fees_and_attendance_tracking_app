import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { BookOpen } from 'lucide-react-native';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start the fade and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Navigate to the main dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-marble-900 justify-center items-center">
      <Animated.View 
        style={{ 
          opacity: fadeAnim, 
          transform: [{ scale: scaleAnim }],
          alignItems: 'center' 
        }}
      >
        <View className="bg-white p-6 rounded-3xl mb-6 shadow-2xl">
          <BookOpen size={72} color="#387373" />
        </View>
        <Text className="text-4xl font-black text-white tracking-wider mb-2">TeachyTech</Text>
        <Text className="text-marble-300 text-sm font-bold tracking-widest uppercase">Teacher Dashboard</Text>
      </Animated.View>
    </View>
  );
}
