import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    let error;

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
      
      if (!error) {
        Alert.alert('Success', 'Account created successfully! You are now logged in.');
        router.back();
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;
      
      if (!error) {
        Alert.alert('Success', 'Logged in successfully!');
        router.back();
      }
    }

    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View className="flex-1 bg-marble-50 p-6 justify-center">
      <Stack.Screen options={{ title: isSignUp ? 'Sign Up' : 'Login', headerLargeTitle: false, headerStyle: { backgroundColor: '#f8fafc' }, headerShadowVisible: false }} />
      
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-emerald-100 rounded-full items-center justify-center mb-6 border-4 border-emerald-50 shadow-sm">
          <ShieldCheck size={48} color="#059669" />
        </View>
        <Text className="text-3xl font-black text-emerald-900 tracking-tight">
          {isSignUp ? 'Create Account' : 'Secure Login'}
        </Text>
        <Text className="text-marble-500 mt-2 text-center font-medium px-4">
          Authenticate to sync your registrar book data safely to the cloud.
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wider ml-1">Email Address</Text>
          <View className="flex-row items-center border-2 border-emerald-100 rounded-2xl px-4 bg-white shadow-sm h-14">
            <Mail size={20} color="#059669" />
            <TextInput
              className="flex-1 h-full ml-3 text-emerald-900 font-bold text-lg"
              placeholder="Enter your email"
              placeholderTextColor="#a7f3d0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View>
          <Text className="text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wider ml-1">Password</Text>
          <View className="flex-row items-center border-2 border-emerald-100 rounded-2xl px-4 bg-white shadow-sm h-14">
            <Lock size={20} color="#059669" />
            <TextInput
              className="flex-1 h-full ml-3 text-emerald-900 font-bold text-lg"
              placeholder="Enter your password"
              placeholderTextColor="#a7f3d0"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        <TouchableOpacity
          className="w-full h-14 bg-emerald-500 rounded-2xl items-center justify-center mt-6 shadow-md"
          onPress={handleAuth}
          disabled={isLoading || !email || !password}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-black text-lg tracking-wide">
              {isSignUp ? 'Sign Up' : 'Login'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full items-center mt-6 py-2"
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text className="text-emerald-600 font-bold">
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
