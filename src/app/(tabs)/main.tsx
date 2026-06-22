import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Animated, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { auth, database } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';

export default function MainScreen() {
  const [nama, setNama] = useState('');
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [isi, setIsi] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser?.email) {
      setNama(auth.currentUser.email);
    }
  }, []);

  const pickImage = async (source: 'camera' | 'gallery') => {
    let result;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Harap izinkan akses kamera untuk mengambil foto.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        base64: true,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Harap izinkan akses galeri untuk memilih foto.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.1, // Extra low quality for base64 optimization
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0] && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const simpanPengaduan = async () => {
    if (!nama || !judul || !isi || !kategori) {
      Alert.alert('Data Belum Lengkap', 'Harap lengkapi semua data laporan termasuk kategori.');
      return;
    }
    setLoading(true);
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Koneksi lambat atau file terlalu besar. Silakan coba lagi.")), 15000)
      );

      const uploadTask = async () => {
        const newPengaduanRef = push(ref(database, 'pengaduan'));
        await set(newPengaduanRef, {
          nama,
          kategori,
          judul,
          isi,
          ...(imageBase64 ? { imageUrl: imageBase64 } : {}),
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
      };

      await Promise.race([uploadTask(), timeoutPromise]);

      setJudul('');
      setKategori('');
      setIsi('');
      setImageBase64(null);
      router.push('/result');
    } catch (error: any) {
      Alert.alert('Gagal mengirim', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <Text style={styles.title}>Buat Laporan</Text>
          <Text style={styles.subtitle}>Sampaikan aspirasi atau keluhan Anda dengan detail agar dapat segera ditindaklanjuti.</Text>
        </View>

        <View style={styles.formSection}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Pelapor</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Identitas Anda" 
                value={nama} 
                onChangeText={setNama} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori Pengaduan</Text>
            <TouchableOpacity 
              style={[styles.inputContainer, { paddingVertical: 16 }]} 
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <Text style={[{ flex: 1, fontSize: 15, color: kategori ? '#0F172A' : '#CBD5E1' }]}>
                {kategori || "Pilih kategori laporan..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Judul Laporan</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Topik singkat pengaduan" 
                value={judul} 
                onChangeText={setJudul} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rincian Kejadian</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#94A3B8" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Uraikan detail kejadian, waktu, dan lokasi kejadian selengkap mungkin..." 
                value={isi} 
                onChangeText={setIsi} 
                multiline 
                numberOfLines={6} 
                placeholderTextColor="#CBD5E1"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* FOTO BUKTI SECTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Foto Bukti (Opsional)</Text>
            
            {imageBase64 ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageBase64(null)}>
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('camera')} activeOpacity={0.7}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="camera" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.imagePickerText}>Ambil Foto</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('gallery')} activeOpacity={0.7}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="images" size={20} color="#7C3AED" />
                  </View>
                  <Text style={styles.imagePickerText}>Pilih Galeri</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View>
            <View style={styles.warningContainer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" style={{marginRight: 6}} />
              <Text style={styles.warningText}>Laporan Anda dilindungi dan bersifat rahasia.</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={simpanPengaduan} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Kirim Laporan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

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
            
            {[
              { id: 'Infrastruktur', icon: 'business' }, 
              { id: 'Kebersihan', icon: 'trash-bin' }, 
              { id: 'Pelayanan Publik', icon: 'people' }, 
              { id: 'Keamanan', icon: 'shield-checkmark' }, 
              { id: 'Lainnya', icon: 'ellipsis-horizontal-circle' }
            ].map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={styles.dropdownOption}
                onPress={() => {
                  setKategori(cat.id);
                  setDropdownVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.dropdownIconWrap, kategori === cat.id && { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name={cat.icon as any} size={18} color={kategori === cat.id ? '#2563EB' : '#64748B'} />
                  </View>
                  <Text style={[styles.dropdownOptionText, kategori === cat.id && { color: '#2563EB', fontWeight: '700' }]}>{cat.id}</Text>
                </View>
                {kategori === cat.id && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
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
  
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', fontWeight: '400', lineHeight: 22, paddingRight: 20 },
  
  formSection: { flex: 1 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    minHeight: 56, // Ensures all inputs have the exact same base height
  },
  inputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  textAreaContainer: { alignItems: 'flex-start', paddingTop: 16, minHeight: 140 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, paddingVertical: 0 },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  imagePickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  imagePickerText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  imagePreviewContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8, backgroundColor: '#FFFFFF', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 4
  },

  warningContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  warningText: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  button: { flexDirection: 'row', backgroundColor: '#2563EB', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  dropdownIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropdownOptionText: { fontSize: 15, color: '#475569', fontWeight: '500' },
});
