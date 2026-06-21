import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Animated, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; // Animasi mengambang

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();

    // Animasi logo melayang tak terbatas (anti boring)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Harap isi email dan password');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user.email === 'admin@gmail.com') {
        router.replace('/(tabs)/list');
      } else {
        router.replace('/(tabs)/main');
      }
    } catch (error: any) {
      Alert.alert('Gagal login', error.message);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              
              <View style={styles.logoContainer}>
                <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.8}>
                  <Animated.Image 
                    source={require('../../assets/app_logo.png')} 
                    style={[styles.logo, { transform: [{ translateY: floatAnim }] }]} 
                  />
                </TouchableOpacity>
                <Text style={styles.title}>Pengaduan Masyarakat</Text>
                <Text style={styles.subtitle}>Masuk untuk mulai melapor</Text>
              </View>
              
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <View style={styles.formContainer}>
                  <Text style={styles.label}>ALAMAT EMAIL</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Masukkan email" 
                    value={email} 
                    onChangeText={setEmail} 
                    autoCapitalize="none" 
                    placeholderTextColor="#9CA3AF"
                  />
                  </View>

                  <Text style={styles.label}>KATA SANDI</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Masukkan kata sandi" 
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry={!showPassword} 
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Text style={styles.buttonText}>MASUK SEKARANG</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Belum punya akun? </Text>
                    <TouchableOpacity onPress={() => router.push('/register')}>
                      <Text style={styles.footerLink}>Daftar di sini</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>

            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#0A2540', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center', lineHeight: 36 },
  subtitle: { fontSize: 15, color: '#475569', fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  
  glassCard: {
    borderRadius: 32,
    padding: 24,
    paddingTop: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  formContainer: { width: '100%' },
  
  label: { fontSize: 12, fontWeight: '800', color: '#0A2540', marginBottom: 8, letterSpacing: 1, marginLeft: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, color: '#1E293B', fontSize: 16, fontWeight: '600' },
  eyeIcon: { padding: 8 },
  
  button: { 
    backgroundColor: '#0A2540', 
    flexDirection: 'row',
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12,
    marginBottom: 24,
    shadowColor: '#0A2540', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  
  footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  footerLink: { fontSize: 15, color: '#2563EB', fontWeight: '800' }
});
