import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  
  // Edit modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNik, setEditNik] = useState('');
  const [saving, setSaving] = useState(false);

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
        }
      });
    }

    return () => unsubscribeStats();
  }, [currentUser]);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/login');
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

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={28} color="#2563EB" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName || 'Pengguna Baru'}</Text>
            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: rankColor.bg, borderColor: rankColor.border }]}>
                <Text style={[styles.roleText, { color: rankColor.text }]}>{getRank(stats.total)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editIconBtn} onPress={openEditModal}>
            <Ionicons name="pencil" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

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
                style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#F1F5F9' }]}
                activeOpacity={0.6}
                onPress={() => router.push('/list?filter=Menunggu')}
              >
                <Text style={[styles.statNum, { color: '#CA8A04' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Menunggu</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#F1F5F9' }]}
                activeOpacity={0.6}
                onPress={() => router.push('/list?filter=Selesai')}
              >
                <Text style={[styles.statNum, { color: '#16A34A' }]}>{stats.finished}</Text>
                <Text style={styles.statLabel}>Selesai</Text>
              </TouchableOpacity>
            </View>
          )}
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
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 110 },
  
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400' },

  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  
  roleBadgeContainer: { marginTop: 6 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  roleText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  editIconBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginLeft: 56 },

  statsSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  statsGrid: { 
    flexDirection: 'row', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12,
    backgroundColor: '#FFFFFF'
  },
  statBox: {
    flex: 1,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statNum: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '500', color: '#64748B', textAlign: 'center' },

  actionSection: { flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    marginLeft: 8,
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
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
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  modalBody: {
    width: '100%',
  },
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
  saveBtn: {
    backgroundColor: '#2563EB',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
