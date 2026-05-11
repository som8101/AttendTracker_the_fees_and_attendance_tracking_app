import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { User, LogOut, LogIn, RefreshCcw, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useSync } from '../../hooks/useSync';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncData } = useSync();

  const handleSync = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to sync data.');
      return;
    }
    
    setIsSyncing(true);
    try {
      await syncData();
      Alert.alert('Success', 'Data synced successfully!');
    } catch (error) {
      Alert.alert('Sync Failed', 'Could not sync data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View className="flex-1 bg-marble-50">
      {/* Vibrant Header */}
      <View className="bg-emerald-500 pt-16 pb-10 px-6 rounded-b-[40px] flex-row items-center z-10 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 p-2 rounded-full border border-white/30">
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text className="text-3xl font-black text-white tracking-tight">Profile</Text>
          <Text className="text-emerald-100 font-medium mt-1">Manage account & sync</Text>
        </View>
      </View>

      <ScrollView className="flex-1 -mt-6 z-20 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <View className="bg-white p-6 rounded-[32px] shadow-sm border border-emerald-50 items-center mb-6">
          <View className="w-24 h-24 bg-emerald-100 rounded-full items-center justify-center mb-4 border-4 border-emerald-50">
            <User size={40} color="#059669" />
          </View>
          
          {user ? (
            <>
              <Text className="text-2xl font-black text-emerald-900 mb-1">
                {user.phone || user.email || 'User'}
              </Text>
              <View className="flex-row items-center bg-emerald-50 px-3 py-1 rounded-full mb-6">
                <ShieldCheck size={16} color="#059669" />
                <Text className="text-emerald-700 font-bold ml-1 text-sm">Securely Logged In</Text>
              </View>
              
              <TouchableOpacity
                onPress={signOut}
                className="flex-row items-center justify-center bg-rose-50 py-4 px-6 rounded-2xl w-full border border-rose-100"
              >
                <LogOut size={20} color="#e11d48" />
                <Text className="text-rose-600 font-black ml-2 text-lg">Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-2xl font-black text-emerald-900 mb-2">Not Logged In</Text>
              <Text className="text-marble-500 text-center mb-6 font-medium px-4">
                Login with your email to securely backup and sync your class data across devices.
              </Text>
              
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="flex-row items-center justify-center bg-emerald-500 py-4 px-6 rounded-2xl w-full shadow-sm"
              >
                <LogIn size={20} color="#ffffff" />
                <Text className="text-white font-black ml-2 text-lg tracking-wide">Login with Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sync Controls */}
        <Text className="text-xl font-black text-emerald-900 mb-3 mx-2">Cloud Sync</Text>
        
        <TouchableOpacity 
          onPress={handleSync}
          disabled={isSyncing || !user}
          className={`bg-white rounded-[24px] shadow-sm border border-blue-50 p-5 flex-row items-center justify-between ${!user && 'opacity-60'}`}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center mr-4">
              <RefreshCcw size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-blue-900 mb-1">Sync All Data</Text>
              <Text className="text-sm font-medium text-blue-600/70">Push offline changes & pull latest updates</Text>
            </View>
          </View>
          {isSyncing ? <ActivityIndicator color="#2563eb" size="large" /> : null}
        </TouchableOpacity>

        <View className="items-center mt-12">
          <Text className="text-marble-400 font-bold text-sm uppercase tracking-widest">
            Samiran Sir's Register
          </Text>
          <Text className="text-marble-300 font-medium text-xs mt-1">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
