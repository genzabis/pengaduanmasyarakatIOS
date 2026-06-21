import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, SafeAreaView, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';

export default function MainScreen() {
  const [nama, setNama] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Staggered Input Animations
  const input1Anim = useRef(new Animated.Value(0)).current;
  const input2Anim = useRef(new Animated.Value(0)).current;
  const input3Anim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();

    // DKV-Level Staggered Entrance
    Animated.stagger(150, [
      Animated.spring(input1Anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(input2Anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(input3Anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(btnAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();

    if (auth.currentUser?.email) {
      setNama(auth.currentUser.email);
    }
  }, []);

  const simpanPengaduan = async () => {
    if (!nama || !judul || !isi) {
      Alert.alert('Error', 'Harap lengkapi semua data laporan!');
      return;
    }
    setLoading(true);
    try {
      const newPengaduanRef = push(ref(database, 'pengaduan'));
      await set(newPengaduanRef, {
        nama,
        judul,
        isi,
        tanggal: Date.now(),
        status: 'Menunggu'
      });

      // --- Notifikasi ke Admin ---
      const adminNotifRef = push(ref(database, 'notifications'));
      await set(adminNotifRef, {
        userId: 'admin@gmail.com', // Tujuan admin
        title: 'Laporan Baru Masuk 🔔',
        message: `Laporan "${judul}" baru saja dikirimkan oleh ${nama}.`,
        time: Date.now(),
        type: 'info',
        read: false
      });
      // --------------------------

      setJudul('');
      setIsi('');
      router.push('/result');
    } catch (error: any) {
      Alert.alert('Gagal mengirim', error.message);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentWrapper}>
          
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View style={styles.header}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>Pengaduan Masyarakat</Text>
                <Text style={styles.subtitle}>Formulir Pelaporan Publik Terpadu</Text>
              </View>
            </View>

            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
                <Text style={styles.cardHeaderTitle}>Identitas & Laporan Baru</Text>
              </View>

              <View style={styles.cardBody}>
                <Animated.View style={[styles.inputGroup, { opacity: input1Anim, transform: [{ scale: input1Anim }] }]}>
                  <Text style={styles.label}>NAMA PELAPOR</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Identitas Anda (Otomatis dari Email)" 
                      value={nama} 
                      onChangeText={setNama} 
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </Animated.View>

                <Animated.View style={[styles.inputGroup, { opacity: input2Anim, transform: [{ scale: input2Anim }] }]}>
                  <Text style={styles.label}>JUDUL LAPORAN</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="document-text" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Topik singkat pengaduan" 
                      value={judul} 
                      onChangeText={setJudul} 
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </Animated.View>

                <Animated.View style={[styles.inputGroup, { opacity: input3Anim, transform: [{ scale: input3Anim }] }]}>
                  <Text style={styles.label}>RINCIAN KEJADIAN</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <TextInput 
                      style={[styles.input, styles.textArea]} 
                      placeholder="Uraikan detail kejadian, lokasi, atau laporan selengkap mungkin..." 
                      value={isi} 
                      onChangeText={setIsi} 
                      multiline 
                      numberOfLines={6} 
                      placeholderTextColor="#9CA3AF"
                      textAlignVertical="top"
                    />
                  </View>
                </Animated.View>
                
                <Animated.View style={{ opacity: btnAnim, transform: [{ scale: btnAnim }] }}>
                  <TouchableOpacity style={styles.button} onPress={simpanPengaduan} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>KIRIM LAPORAN SEKARANG</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>

            </Animated.View>

          </ScrollView>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contentWrapper: { flex: 1 },
  // Increased paddingBottom to account for the TabBar height (which is ~88 on iOS)
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 110, flexGrow: 1 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 34, fontWeight: '900', color: '#0A2540', letterSpacing: -0.5, lineHeight: 40 },
  subtitle: { fontSize: 13, color: '#1E3A8A', marginTop: 6, fontWeight: '600', letterSpacing: 0.5 },
  
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F9FAFB',
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  cardHeaderTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540'
  },
  cardBody: {
    padding: 20,
  },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#6B7280', marginBottom: 8, letterSpacing: 1 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  inputIcon: { marginRight: 12 },
  textAreaContainer: { alignItems: 'flex-start', paddingVertical: 16 },
  input: { flex: 1, paddingVertical: 16, color: '#111827', fontSize: 15, fontWeight: '500' },
  textArea: { height: 120, paddingTop: 0 },
  
  button: { 
    flexDirection: 'row',
    backgroundColor: '#0A2540', 
    height: 56, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#0A2540', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8
  },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
