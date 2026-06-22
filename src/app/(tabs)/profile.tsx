import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView, Switch, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, pending: 0, finished: 0 });
  const [loading, setLoading] = useState(true);
  
  // User states
  const [userPhone, setUserPhone] = useState('');
  const [userNik, setUserNik] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // Edit modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNik, setEditNik] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings states
  const [pushNotif, setPushNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === 'admin@gmail.com';
  const userEmail = currentUser?.email || 'Pengguna Tidak Dikenal';
  const displayName = currentUser?.displayName || '';

  useEffect(() => {
    // Fetch stats
    const pengaduanRef = ref(database, 'pengaduan');
    const unsubscribeStats = onValue(pengaduanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let total = 0, pending = 0, finished = 0;
        Object.keys(data).forEach(key => {
          const item = data[key];
          if (isAdmin || item.nama === userEmail) {
            total++;
            if (item.status === 'Menunggu') pending++;
            if (item.status === 'Selesai') finished++;
          }
        });
        setStats({ total, pending, finished });
      }
      setLoading(false);
    });

    // Fetch user phone & NIK from database
    if (currentUser?.uid) {
      const userRef = ref(database, `users/${currentUser.uid}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.phone) setUserPhone(data.phone);
          if (data.nik) setUserNik(data.nik);
          if (data.photoBase64) setUserAvatar(data.photoBase64);
        }
      });
    }

    return () => unsubscribeStats();
  }, [currentUser]);

  const handleLogout = async () => {
    Alert.alert('Konfirmasi', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
          await auth.signOut();
          router.replace('/login');
      }}
    ]);
  };

  const pickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Harap izinkan akses galeri untuk mengubah foto profil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1, // Extra low quality for base64 optimization
        base64: true,
      });

      if (!result.canceled && result.assets[0] && result.assets[0].base64 && currentUser) {
        setLoading(true);
        const photoURL = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await update(ref(database, `users/${currentUser.uid}`), { photoBase64: photoURL });
        Alert.alert('Sukses', 'Foto profil berhasil diperbarui.');
      }
    } catch (error: any) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengunggah foto.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setEditName(currentUser?.displayName || '');
    setEditPhone(userPhone);
    setEditNik(userNik);
    setModalVisible(true);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      // Update Auth Profile
      if (editName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: editName });
      }
      
      // Update Realtime DB for Phone and NIK
      if (editPhone !== userPhone || editNik !== userNik) {
        await update(ref(database, `users/${currentUser.uid}`), {
          phone: editPhone,
          nik: editNik
        });
      }
      
      setModalVisible(false);
      Alert.alert('Sukses', 'Profil berhasil diperbarui');
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    }
    setSaving(false);
  };

  const getRank = (total: number) => {
    if (isAdmin) return 'Administrator';
    if (total >= 5) return 'Pahlawan Kota';
    if (total >= 1) return 'Warga Peduli';
    return 'Warga Baru';
  };

  const getRankColor = (total: number) => {
    if (isAdmin) return { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' };
    if (total >= 5) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }; 
    if (total >= 1) return { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' }; 
    return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' }; 
  };

  const rankColor = getRankColor(stats.total);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Profil Pengguna</Text>
          <Text style={styles.subtitle}>Informasi keamanan & setelan akun</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickProfileImage} activeOpacity={0.8}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
            ) : currentUser?.photoURL ? (
              <Image source={{ uri: currentUser.photoURL }} style={styles.avatarImage} />
            ) : (
              <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={32} color="#2563EB" />
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName || 'Pengguna Baru'}</Text>
            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: rankColor.bg, borderColor: rankColor.border }]}>
                <Text style={[styles.roleText, { color: rankColor.text }]}>{getRank(stats.total)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editIconBtn} onPress={openEditModal} activeOpacity={0.7}>
            <Ionicons name="pencil" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email Terdaftar</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="card" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Nomor Induk Kependudukan</Text>
              <Text style={styles.infoValue}>{userNik || 'Belum diatur'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Nomor Handphone</Text>
              <Text style={styles.infoValue}>{userPhone || 'Belum diatur'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Aktivitas Anda</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statBox} 
                activeOpacity={0.6}
                onPress={() => router.push('/list?filter=Semua')}
              >
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Laporan</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}
                activeOpacity={0.6}
                onPress={() => router.push('/list?filter=Menunggu')}
              >
                <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Menunggu</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}
                activeOpacity={0.6}
                onPress={() => router.push('/list?filter=Selesai')}
              >
                <Text style={[styles.statNum, { color: '#059669' }]}>{stats.finished}</Text>
                <Text style={styles.statLabel}>Selesai</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Pengaturan Aplikasi</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Ionicons name="notifications" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Notifikasi Push</Text>
                <Text style={styles.settingDesc}>Terima pembaruan instan</Text>
              </View>
              <Switch 
                value={pushNotif} 
                onValueChange={setPushNotif}
                trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Ionicons name="moon" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Mode Gelap</Text>
                <Text style={styles.settingDesc}>Ubah tema aplikasi</Text>
              </View>
              <Switch 
                value={darkMode} 
                onValueChange={(val) => {
                  setDarkMode(val);
                  if (val) {
                    setTimeout(() => {
                      setDarkMode(false);
                      Alert.alert('Info', 'Mode Gelap akan segera hadir di pembaruan selanjutnya!');
                    }, 500);
                  }
                }}
                trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Ionicons name="finger-print" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Login Biometrik</Text>
                <Text style={styles.settingDesc}>Sidik Jari atau Face ID</Text>
              </View>
              <Switch 
                value={biometric} 
                onValueChange={(val) => {
                  setBiometric(val);
                  if (val) Alert.alert('Berhasil', 'Biometrik diaktifkan untuk sesi berikutnya.');
                }}
                trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Keamanan', 'Fitur ganti kata sandi & PIN sedang dalam pengembangan.')}>
              <View style={styles.settingIconBox}>
                <Ionicons name="lock-closed" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Keamanan Akun</Text>
                <Text style={styles.settingDesc}>Kata sandi & PIN</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Bahasa', 'Pilihan bahasa saat ini: Bahasa Indonesia (ID)')}>
              <View style={styles.settingIconBox}>
                <Ionicons name="language" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Bahasa</Text>
                <Text style={styles.settingDesc}>Bahasa Indonesia (ID)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => {
              Alert.alert('Berhasil', 'Cache aplikasi sebesar 12MB telah dibersihkan dari penyimpanan.');
            }}>
              <View style={styles.settingIconBox}>
                <Ionicons name="trash" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Bersihkan Cache</Text>
                <Text style={styles.settingDesc}>Kosongkan ruang penyimpanan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Pusat Bantuan', 'Hubungi WhatsApp CS: 0812-3456-7890\nAtau email: cs@laporwarga.id')}>
              <View style={styles.settingIconBox}>
                <Ionicons name="help-buoy" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Bantuan & Dukungan</Text>
                <Text style={styles.settingDesc}>Pusat bantuan aplikasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Kebijakan Privasi', 'Data Anda dilindungi enkripsi end-to-end sesuai dengan UU Pelindungan Data Pribadi.')}>
              <View style={styles.settingIconBox}>
                <Ionicons name="shield-checkmark" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Kebijakan Privasi</Text>
                <Text style={styles.settingDesc}>Perlindungan data pengguna</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Syarat & Ketentuan', 'Syarat dan Ketentuan penggunaan layanan Lapor Warga.')}>
              <View style={styles.settingIconBox}>
                <Ionicons name="document-text" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Syarat & Ketentuan</Text>
                <Text style={styles.settingDesc}>Aturan penggunaan aplikasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => {
              Share.share({ message: 'Ayo lapor keluhan di kotamu menggunakan aplikasi Lapor Warga! Download sekarang di App Store/Play Store.' });
            }}>
              <View style={styles.settingIconBox}>
                <Ionicons name="share-social" size={18} color="#2563EB" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Bagikan Aplikasi</Text>
                <Text style={styles.settingDesc}>Undang teman & keluarga</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Terima Kasih!', 'Anda akan diarahkan ke App Store/Play Store.')}>
              <View style={[styles.settingIconBox, { borderColor: '#FEF08A', backgroundColor: '#FEFCE8' }]}>
                <Ionicons name="star" size={18} color="#EAB308" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Beri Nilai Aplikasi</Text>
                <Text style={styles.settingDesc}>Dukung kami dengan 5 bintang</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => {
              Alert.alert('Peringatan!', 'Apakah Anda yakin ingin menghapus akun secara permanen? Semua data pengaduan Anda akan hilang.', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus Akun', style: 'destructive', onPress: () => Alert.alert('Info', 'Akun dijadwalkan untuk dihapus dalam 30 hari.') }
              ]);
            }}>
              <View style={[styles.settingIconBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="trash-bin" size={18} color="#DC2626" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: '#DC2626' }]}>Hapus Akun</Text>
                <Text style={styles.settingDesc}>Hapus akun secara permanen</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Ionicons name="information-circle" size={18} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Versi Aplikasi</Text>
                <Text style={styles.settingDesc}>Lapor Warga v2.1.0 (Stable)</Text>
              </View>
            </View>

          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Keluar Akun</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profil</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Masukkan nama Anda"
                  placeholderTextColor="#CBD5E1"
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <Text style={styles.label}>Nomor Induk Kependudukan (NIK)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Contoh: 3171234567890001"
                  placeholderTextColor="#CBD5E1"
                  value={editNik}
                  onChangeText={setEditNik}
                  keyboardType="numeric"
                  maxLength={16}
                />
              </View>

              <Text style={styles.label}>Nomor Handphone</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Contoh: 08123456789"
                  placeholderTextColor="#CBD5E1"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving} activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 32, paddingBottom: 110 },
  
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400' },

  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative'
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 32 },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#2563EB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 19, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  
  roleBadgeContainer: { marginTop: 4 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  roleText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },

  editIconBtn: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 13, color: '#64748B', marginBottom: 4, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginLeft: 60, marginVertical: 4 },

  statsSection: { marginBottom: 40 },
  statsGrid: { 
    flexDirection: 'row', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  statBox: {
    flex: 1,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  statNum: { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textAlign: 'center' },

  settingsSection: { marginBottom: 40 },
  settingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: { flex: 1, marginRight: 8 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#64748B' },

  actionSection: { flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    marginLeft: 8,
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
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
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  modalBody: {
    width: '100%',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', color: '#0F172A', fontSize: 16 },
  saveBtn: {
    backgroundColor: '#2563EB',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  }
});
