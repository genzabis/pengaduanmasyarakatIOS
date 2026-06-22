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
  const [biometric, setBiometric] = useState(false);

  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === 'admin@gmail.com';
  const userEmail = currentUser?.email || 'Pengguna Tidak Dikenal';
  const displayName = currentUser?.displayName || '';

  useEffect(() => {
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
        quality: 0.1,
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
      if (editName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: editName });
      }
      
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
    if (isAdmin) return { bg: '#EFF6FF', text: '#2563EB', icon: 'shield-checkmark' };
    if (total >= 5) return { bg: '#FEF2F2', text: '#DC2626', icon: 'star' }; 
    if (total >= 1) return { bg: '#F0FDF4', text: '#16A34A', icon: 'leaf' }; 
    return { bg: '#F8FAFC', text: '#64748B', icon: 'person' }; 
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
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {displayName ? displayName.substring(0, 2).toUpperCase() : 'US'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName || 'Pengguna Baru'}</Text>
            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: rankColor.bg }]}>
                <Ionicons name={rankColor.icon as any} size={12} color={rankColor.text} style={{ marginRight: 4 }} />
                <Text style={[styles.roleText, { color: rankColor.text }]}>{getRank(stats.total)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editIconBtn} onPress={openEditModal} activeOpacity={0.7}>
            <Ionicons name="pencil" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Stats Strip (Matched with Home) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktivitas Anda</Text>
        </View>
        <View style={styles.statsStrip}>
          <TouchableOpacity style={styles.statsStripItem} activeOpacity={0.6} onPress={() => router.push('/list?filter=Semua')}>
            <Text style={styles.statsStripNum}>{stats.total}</Text>
            <Text style={styles.statsStripLabel}>Total</Text>
          </TouchableOpacity>
          <View style={styles.statsStripDivider} />
          <TouchableOpacity style={styles.statsStripItem} activeOpacity={0.6} onPress={() => router.push('/list?filter=Menunggu')}>
            <Text style={styles.statsStripNum}>{stats.pending}</Text>
            <Text style={styles.statsStripLabel}>Menunggu</Text>
          </TouchableOpacity>
          <View style={styles.statsStripDivider} />
          <TouchableOpacity style={styles.statsStripItem} activeOpacity={0.6} onPress={() => router.push('/list?filter=Selesai')}>
            <Text style={styles.statsStripNum}>{stats.finished}</Text>
            <Text style={styles.statsStripLabel}>Selesai</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Panel Admin</Text>
            </View>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => router.push('/admin/users')}>
                <View style={[styles.settingIconBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1 }]}>
                  <Ionicons name="people" size={18} color="#2563EB" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Kelola Pengguna</Text>
                  <Text style={styles.settingDesc}>Manajemen data warga terdaftar</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              
              <View style={styles.divider} />

              <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => router.push('/admin/broadcast')}>
                <View style={[styles.settingIconBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1 }]}>
                  <Ionicons name="megaphone" size={18} color="#EF4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Pesan Siaran</Text>
                  <Text style={styles.settingDesc}>Kirim pengumuman massal ke warga</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Personal Info */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email Terdaftar</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="card-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Nomor Induk Kependudukan</Text>
              <Text style={styles.infoValue}>{userNik || 'Belum diatur'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Nomor Handphone</Text>
              <Text style={styles.infoValue}>{userPhone || 'Belum diatur'}</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pengaturan Aplikasi</Text>
        </View>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Ionicons name="notifications-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Notifikasi Push</Text>
              <Text style={styles.settingDesc}>Terima pembaruan instan</Text>
            </View>
            <Switch 
              value={pushNotif} 
              onValueChange={setPushNotif}
              trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Ionicons name="finger-print-outline" size={18} color="#64748B" />
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
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => Alert.alert('Keamanan', 'Fitur ganti kata sandi & PIN sedang dalam pengembangan.')}>
            <View style={styles.settingIconBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Keamanan Akun</Text>
              <Text style={styles.settingDesc}>Kata sandi & PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => Alert.alert('Pusat Bantuan', 'Hubungi WhatsApp CS: 0812-3456-7890')}>
            <View style={styles.settingIconBox}>
              <Ionicons name="help-buoy-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Bantuan & Dukungan</Text>
              <Text style={styles.settingDesc}>Pusat bantuan aplikasi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { marginTop: 8 }]}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={handleLogout}>
            <View style={[styles.settingIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Keluar Akun</Text>
              <Text style={styles.settingDesc}>Akhiri sesi Anda saat ini</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Profil</Text>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Nama Lengkap</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Masukkan nama Anda"
                    placeholderTextColor="#CBD5E1"
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nomor Induk Kependudukan</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="card-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
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
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nomor Handphone</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Contoh: 08123456789"
                    placeholderTextColor="#CBD5E1"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                  </>
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
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 36 : 16, paddingBottom: 100 },
  
  // Header
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', lineHeight: 20 },

  // Profile Card
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, marginRight: 16, position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 30 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 20, fontWeight: '700', color: '#3B82F6' },
  cameraIconBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#2563EB', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  roleBadgeContainer: { flexDirection: 'row' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '700' },
  editIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },

  // Sections
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Stats Strip (Match with Home)
  statsStrip: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  statsStripItem: { flex: 1, alignItems: 'center' },
  statsStripDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  statsStripNum: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 1 },
  statsStripLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  // Cards
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24 },
  
  // Info Rows
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12, marginLeft: 54 },

  // Setting Rows
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  settingIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingTextContainer: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  settingDesc: { fontSize: 12, color: '#94A3B8' },

  // Modal Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  modalBody: { width: '100%' },

  // Modal Fields
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  
  // Modal Save
  saveBtn: { flexDirection: 'row', backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }
});
