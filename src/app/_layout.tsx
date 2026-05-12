import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../database/schema';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from '../hooks/useAuth';
import { GlobalSync } from '../components/GlobalSync';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <React.Suspense fallback={
        <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      }>
        <SQLiteProvider databaseName="teachytech.db" onInit={migrateDbIfNeeded} useSuspense>
          <AuthProvider>
            <GlobalSync />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="student/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthProvider>
        </SQLiteProvider>
      </React.Suspense>
    </ThemeProvider>
  );
}
