import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { auth, database } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';
import { Colors } from '../../constants/Colors';

const KATEGORI_LIST = [
  { id: 'Infrastruktur', icon: 'business', color: '#3B82F6', bg: '#EFF6FF' }, 
  { id: 'Kebersihan', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' }, 
  { id: 'Pelayanan Publik', icon: 'people', color: '#8B5CF6', bg: '#F5F3FF' }, 
  { id: 'Keamanan', icon: 'shield-checkmark', color: '#EF4444', bg: '#FEF2F2' }, 
  { id: 'Lainnya', icon: 'ellipsis-horizontal-circle', color: '#64748B', bg: '#F1F5F9' }
];

export default function MainScreen() {
  const [nama, setNama] = useState('');
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [isi, setIsi] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Audio state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();

  const theme = Colors.light;

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
        quality: 0.1,
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0] && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi butuh akses lokasi untuk fitur ini.');
        setGettingLocation(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat mengambil lokasi. Pastikan GPS aktif.');
    }
    setGettingLocation(false);
  };

  // Audio Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 10) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Harap izinkan akses mikrofon untuk merekam suara.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordDuration(0);
    } catch (err) {
      Alert.alert('Gagal merekam', 'Gagal memulai rekaman suara');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setAudioBase64(`data:audio/m4a;base64,${base64}`);
      }
    } catch (e) {}
    setRecording(null);
  };

  const simpanPengaduan = async () => {
    if (!nama || !judul || !isi || !kategori) {
      Alert.alert('Data Belum Lengkap', 'Harap lengkapi semua data laporan termasuk kategori.');
      return;
    }
    setLoading(true);
    try {
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
          ...(location ? { location } : {}),
          ...(audioBase64 ? { audioBase64 } : {}),
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
      setLocation(null);
      setAudioBase64(null);
      router.push('/result');
    } catch (error: any) {
      Alert.alert('Gagal mengirim', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = KATEGORI_LIST.find(c => c.id === kategori);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Buat Laporan</Text>
          <Text style={s.headerSub}>Isi formulir di bawah untuk menyampaikan pengaduan Anda.</Text>
        </View>

        {/* Form */}
        <View style={s.formCard}>
          
          {/* Nama */}
          <View style={s.field}>
            <Text style={s.label}>Nama Pelapor</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={18} color="#94A3B8" style={s.inputIcon} />
              <TextInput 
                style={s.input} 
                placeholder="Identitas Anda" 
                value={nama} 
                onChangeText={setNama} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          {/* Kategori */}
          <View style={s.field}>
            <Text style={s.label}>Kategori</Text>
            <TouchableOpacity style={s.inputRow} onPress={() => setDropdownVisible(true)} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={18} color="#94A3B8" style={s.inputIcon} />
              {selectedCat ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[s.catMini, { backgroundColor: selectedCat.bg }]}>
                    <Ionicons name={selectedCat.icon as any} size={14} color={selectedCat.color} />
                  </View>
                  <Text style={[s.input, { flex: 0 }]}>{kategori}</Text>
                </View>
              ) : (
                <Text style={[s.input, { color: '#CBD5E1', flex: 1 }]}>Pilih kategori...</Text>
              )}
              <Ionicons name="chevron-down" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Judul */}
          <View style={s.field}>
            <Text style={s.label}>Judul Laporan</Text>
            <View style={s.inputRow}>
              <Ionicons name="document-text-outline" size={18} color="#94A3B8" style={s.inputIcon} />
              <TextInput 
                style={s.input} 
                placeholder="Topik singkat pengaduan" 
                value={judul} 
                onChangeText={setJudul} 
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          {/* Isi */}
          <View style={s.field}>
            <Text style={s.label}>Rincian Kejadian</Text>
            <View style={s.textAreaWrap}>
              <TextInput 
                style={s.textArea} 
                placeholder="Uraikan detail kejadian, lokasi, dan waktu selengkap mungkin..." 
                value={isi} 
                onChangeText={setIsi} 
                multiline 
                numberOfLines={5}
                placeholderTextColor="#CBD5E1"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Foto */}
          <View style={s.field}>
            <Text style={s.label}>Foto Bukti <Text style={{ fontWeight: '400', color: '#CBD5E1' }}>(Opsional)</Text></Text>
            {imageBase64 ? (
              <View style={s.imagePreview}>
                <Image source={{ uri: imageBase64 }} style={s.imagePreviewImg} />
                <TouchableOpacity style={s.imageRemoveBtn} onPress={() => setImageBase64(null)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.imagePickerRow}>
                <TouchableOpacity style={s.imagePickerBtn} onPress={() => pickImage('camera')} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={20} color="#3B82F6" />
                  <Text style={s.imagePickerText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.imagePickerBtn} onPress={() => pickImage('gallery')} activeOpacity={0.7}>
                  <Ionicons name="images-outline" size={20} color="#8B5CF6" />
                  <Text style={s.imagePickerText}>Galeri</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Lokasi */}
          <View style={s.field}>
            <Text style={s.label}>Lokasi Kejadian (GPS) <Text style={{ fontWeight: '400', color: '#CBD5E1' }}>(Opsional)</Text></Text>
            {location ? (
              <View style={s.locationPreview}>
                <View style={s.locationInfo}>
                  <Ionicons name="location" size={20} color="#10B981" />
                  <Text style={s.locationText}>Tersimpan: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
                </View>
                <TouchableOpacity style={s.imageRemoveBtn} onPress={() => setLocation(null)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.locationBtn} onPress={getLocation} disabled={gettingLocation} activeOpacity={0.7}>
                {gettingLocation ? <ActivityIndicator size="small" color="#3B82F6" /> : <Ionicons name="location-outline" size={20} color="#3B82F6" />}
                <Text style={s.locationBtnText}>{gettingLocation ? 'Mengambil titik GPS...' : 'Ambil Lokasi Saat Ini'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Voice Note */}
          <View style={s.field}>
            <Text style={s.label}>Voice Note (Maks 10 Detik) <Text style={{ fontWeight: '400', color: '#CBD5E1' }}>(Opsional)</Text></Text>
            {audioBase64 ? (
              <View style={[s.locationPreview, { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' }]}>
                <View style={s.locationInfo}>
                  <Ionicons name="mic" size={20} color="#8B5CF6" />
                  <Text style={[s.locationText, { color: '#6D28D9' }]}>Rekaman tersimpan (Siap kirim)</Text>
                </View>
                <TouchableOpacity style={s.imageRemoveBtn} onPress={() => setAudioBase64(null)}>
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[s.locationBtn, { backgroundColor: isRecording ? '#FEF2F2' : '#F8FAFC', borderColor: isRecording ? '#FECACA' : '#F1F5F9' }]} 
                onPress={isRecording ? stopRecording : startRecording} 
                activeOpacity={0.7}
              >
                {isRecording ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="stop-circle" size={20} color="#EF4444" />
                    <Text style={[s.locationBtnText, { color: '#EF4444', marginLeft: 8 }]}>Merekam... {recordDuration}d / 10d (Ketuk untuk Stop)</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="mic-outline" size={20} color="#8B5CF6" />
                    <Text style={[s.locationBtnText, { color: '#8B5CF6', marginLeft: 8 }]}>Ketuk untuk merekam suara</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

        </View>

        {/* Submit */}
        <View style={s.submitSection}>
          <View style={s.disclaimerRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" />
            <Text style={s.disclaimerText}>Laporan Anda dilindungi dan bersifat rahasia.</Text>
          </View>
          <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={simpanPengaduan} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={s.submitBtnText}>Kirim Laporan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} onPress={() => setDropdownVisible(false)} activeOpacity={1} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Pilih Kategori</Text>
            
            {KATEGORI_LIST.map((cat) => {
              const isSelected = kategori === cat.id;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[s.modalOption, isSelected && s.modalOptionActive]}
                  onPress={() => { setKategori(cat.id); setDropdownVisible(false); }}
                  activeOpacity={0.6}
                >
                  <View style={[s.modalOptionIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={[s.modalOptionText, isSelected && { color: '#2563EB', fontWeight: '700' }]}>{cat.id}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 36 : 16, paddingBottom: 100 },

  // Header
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#94A3B8', lineHeight: 20 },

  // Form Card
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 16 },

  // Field
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, minHeight: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 0 },
  catMini: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },

  // Text Area
  textAreaWrap: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', padding: 12 },
  textArea: { fontSize: 15, color: '#0F172A', minHeight: 100, textAlignVertical: 'top', lineHeight: 22 },

  // Image & Location Picker
  imagePickerRow: { flexDirection: 'row', gap: 10 },
  imagePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 6 },
  imagePickerText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  imagePreview: { position: 'relative', height: 160, borderRadius: 12, overflow: 'hidden' },
  imagePreviewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageRemoveBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFFFFF', borderRadius: 12 },

  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 6 },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  locationPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  locationText: { fontSize: 13, color: '#047857', fontWeight: '500' },

  // Submit
  submitSection: { marginTop: 4 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 5 },
  disclaimerText: { fontSize: 12, color: '#94A3B8' },
  submitBtn: { flexDirection: 'row', backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionActive: { backgroundColor: '#F8FAFC', marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 0 },
  modalOptionIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#475569' },
});
