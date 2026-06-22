import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors } from '../constants/Colors';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const theme = Colors.light;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '647784359192-7jkfd8gq8f9cr6dbd7b8du03ds15q89l.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;
          await set(ref(database, 'users/' + user.uid), {
            email: user.email,
            role: 'warga',
            createdAt: Date.now()
          });
          router.replace('/(tabs)/home');
        })
        .catch((error: any) => {
          Alert.alert('Gagal daftar Google', error.message);
          setLoading(false);
        });
    }
  }, [response]);

  const handleGoogleRegister = async () => {
    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        await set(ref(database, 'users/' + user.uid), {
          email: user.email,
          role: 'warga',
          createdAt: Date.now()
        });
        router.replace('/(tabs)/home');
      } catch (error: any) {
        Alert.alert('Gagal daftar Google', error.message);
        setLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Harap lengkapi semua kolom');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Kata sandi tidak cocok');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await set(ref(database, 'users/' + user.uid), {
        email: user.email,
        role: 'warga',
        createdAt: Date.now()
      });

      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Gagal daftar', error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.8} style={{ alignItems: 'center' }}>
              <Image source={require('../../assets/app_logo.png')} style={styles.logo} />
              <Text style={[styles.appName, { color: theme.text }]}>Pengaduan Masyarakat</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Daftar Akun</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Bergabunglah untuk mulai melapor</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="Masukkan email Anda" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address"
                placeholderTextColor={theme.icon}
              />
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Kata Sandi</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="Masukkan kata sandi" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword} 
                placeholderTextColor={theme.icon}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Konfirmasi Kata Sandi</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="Ulangi kata sandi" 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry={!showConfirmPassword} 
                placeholderTextColor={theme.icon}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Daftar Sekarang</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.separatorText, { color: theme.icon }]}>ATAU</Text>
              <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity 
              style={[styles.googleButton, { backgroundColor: theme.card, borderColor: theme.border }]} 
              onPress={handleGoogleRegister}
              disabled={(!request && Platform.OS !== 'web') || loading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/google_logo.png')} style={styles.googleIcon} />
              <Text style={[styles.googleButtonText, { color: theme.text }]}>Daftar dengan Google</Text>
            </TouchableOpacity>
            
            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={[styles.footerLink, { color: theme.tint }]}>Masuk</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  
  header: { marginBottom: 32, alignItems: 'center' },
  logo: { width: 140, height: 140, resizeMode: 'contain', marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '800', marginBottom: 32, letterSpacing: -0.5, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '400', textAlign: 'center' },
  
  formContainer: { width: '100%' },
  
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 15 },
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
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },

  separatorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { marginHorizontal: 12, fontSize: 12, fontWeight: '600' },
  
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  googleButtonText: { fontSize: 15, fontWeight: '600' }
});
