import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, SafeAreaView, Animated, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';

export default function MainScreen() {
  const [nama, setNama] = useState('');
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [isi, setIsi] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();

  // Subtle Fade Up Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const input1Anim = useRef(new Animated.Value(0)).current;
  const catAnim = useRef(new Animated.Value(0)).current;
  const input2Anim = useRef(new Animated.Value(0)).current;
  const input3Anim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(input1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(catAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(input2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(input3Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btnAnim, { toValue: 1, duration: 400, useNativeDriver: true })
    ]).start();

    if (auth.currentUser?.email) {
      setNama(auth.currentUser.email);
    }
  }, []);

  const simpanPengaduan = async () => {
    if (!nama || !judul || !isi || !kategori) {
      Alert.alert('Error', 'Harap lengkapi semua data laporan termasuk kategori!');
      return;
    }
    setLoading(true);
    try {
      const newPengaduanRef = push(ref(database, 'pengaduan'));
      await set(newPengaduanRef, {
        nama,
        kategori,
        judul,
        isi,
        tanggal: Date.now(),
        status: 'Menunggu'
      });

      const adminNotifRef = push(ref(database, 'notifications'));
      await set(adminNotifRef, {
        userId: 'admin@gmail.com',
        title: 'Laporan Baru Masuk 🔔',
        message: `Laporan "${judul}" baru saja dikirimkan oleh ${nama}.`,
        time: Date.now(),
        type: 'info',
        read: false
      });

      setJudul('');
      setKategori('');
      setIsi('');
      router.push('/result');
    } catch (error: any) {
      Alert.alert('Gagal mengirim', error.message);
    }
    setLoading(false);
  };

  const translateY = (anim: Animated.Value) => anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: translateY(headerAnim) }] }]}>
          <Text style={styles.title}>Laporan Baru</Text>
          <Text style={styles.subtitle}>Sampaikan aspirasi atau aduan Anda dengan detail.</Text>
        </Animated.View>

        <View style={styles.formSection}>
          <Animated.View style={[styles.inputGroup, { opacity: input1Anim, transform: [{ translateY: translateY(input1Anim) }] }]}>
            <Text style={styles.label}>NAMA PELAPOR</Text>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Identitas Anda" 
                value={nama} 
                onChangeText={setNama} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: catAnim, transform: [{ translateY: translateY(catAnim) }] }]}>
            <Text style={styles.label}>KATEGORI PENGADUAN</Text>
            <TouchableOpacity 
              style={[styles.inputContainer, styles.dropdownTrigger]} 
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15, color: kategori ? '#0F172A' : '#CBD5E1' }}>
                {kategori || "Pilih kategori laporan..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: input2Anim, transform: [{ translateY: translateY(input2Anim) }] }]}>
            <Text style={styles.label}>JUDUL LAPORAN</Text>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Topik singkat pengaduan" 
                value={judul} 
                onChangeText={setJudul} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: input3Anim, transform: [{ translateY: translateY(input3Anim) }] }]}>
            <Text style={styles.label}>RINCIAN KEJADIAN</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Uraikan detail kejadian, lokasi, atau laporan selengkap mungkin..." 
                value={isi} 
                onChangeText={setIsi} 
                multiline 
                numberOfLines={6} 
                placeholderTextColor="#CBD5E1"
                textAlignVertical="top"
              />
            </View>
          </Animated.View>
          
          <Animated.View style={{ opacity: btnAnim, transform: [{ translateY: translateY(btnAnim) }] }}>
            <TouchableOpacity style={styles.button} onPress={simpanPengaduan} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Kirim Laporan</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

      </ScrollView>

      {/* Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setDropdownVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kategori</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {['Infrastruktur & Fasilitas', 'Kebersihan', 'Pelayanan Publik', 'Keamanan', 'Lainnya'].map((cat) => (
              <TouchableOpacity 
                key={cat} 
                style={styles.dropdownOption}
                onPress={() => {
                  setKategori(cat);
                  setDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, kategori === cat && { color: '#2563EB', fontWeight: '600' }]}>{cat}</Text>
                {kategori === cat && <Ionicons name="checkmark" size={20} color="#2563EB" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 110, flexGrow: 1 },
  
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400', lineHeight: 22 },
  
  formSection: { flex: 1 },
  
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8, letterSpacing: 0.5 },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  textAreaContainer: { paddingVertical: 16 },
  input: { paddingVertical: 16, color: '#0F172A', fontSize: 15 },
  textArea: { height: 120, paddingTop: 0 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  
  button: { backgroundColor: '#2563EB', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16, letterSpacing: 0.5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  dropdownOptionText: { fontSize: 15, color: '#475569' },
});
