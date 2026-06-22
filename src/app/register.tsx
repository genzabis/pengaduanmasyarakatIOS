import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '647784359192-7jkfd8gq8f9cr6dbd7b8du03ds15q89l.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          Alert.alert('Sukses', 'Registrasi/Login Google berhasil!', [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]);
        })
        .catch((error: any) => {
          Alert.alert('Gagal daftar dengan Google', error.message);
          setLoading(false);
        });
    }
  }, [response]);

  const handleGoogleRegister = async () => {
    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        Alert.alert('Sukses', 'Registrasi/Login Google berhasil!', [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]);
      } catch (error: any) {
        Alert.alert('Gagal daftar dengan Google', error.message);
        setLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Harap isi email dan password');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('Sukses', 'Registrasi berhasil! Silakan masuk.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
    } catch (error: any) {
      Alert.alert('Gagal registrasi', error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.8} style={{ alignItems: 'center' }}>
              <Image source={require('../../assets/app_logo.png')} style={styles.logo} />
              <Text style={styles.appName}>Pengaduan Masyarakat</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Buat Akun</Text>
            <Text style={styles.subtitle}>Daftar untuk mulai melapor</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Masukkan email aktif" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address"
                placeholderTextColor="#CBD5E1"
              />
            </View>

            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Buat kata sandi" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword} 
                placeholderTextColor="#CBD5E1"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Daftar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ATAU</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleGoogleRegister}
              disabled={(!request && Platform.OS !== 'web') || loading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/google_logo.png')} style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Daftar dengan Google</Text>
            </TouchableOpacity>
            
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Masuk</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  
  header: { marginBottom: 32, alignItems: 'center' },
  logo: { width: 140, height: 140, resizeMode: 'contain', marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 32, letterSpacing: -0.5, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400', textAlign: 'center' },
  
  formContainer: { width: '100%' },
  
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', color: '#0F172A', fontSize: 15 },
  eyeIcon: { padding: 8 },
  
  button: { 
    backgroundColor: '#2563EB', 
    height: 56, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
    marginBottom: 20,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  
  footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#64748B' },
  footerLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },

  separatorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  separatorText: { marginHorizontal: 12, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 56,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleButtonText: { fontSize: 15, fontWeight: '600', color: '#0F172A' }
});
