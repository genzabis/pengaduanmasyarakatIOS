import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { database } from '../../../firebaseConfig';
import { ref, onValue, remove, update } from 'firebase/database';

interface UserData {
  uid: string;
  email: string;
  nik?: string;
  phone?: string;
  role?: string;
  createdAt?: number;
  photoBase64?: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editNik, setEditNik] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedUsers = Object.keys(data).map(key => ({
          uid: key,
          ...data[key]
        }));
        setUsers(parsedUsers);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditNik(user.nik || '');
    setEditPhone(user.phone || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await update(ref(database, `users/${selectedUser.uid}`), {
        nik: editNik,
        phone: editPhone
      });
      setModalVisible(false);
      Alert.alert('Sukses', 'Data pengguna berhasil diperbarui.');
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Hapus Data Pengguna',
      'Data profil pengguna ini akan dihapus dari sistem. Akun otentikasi login tetap ada, tapi profil akan direset. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await remove(ref(database, `users/${selectedUser.uid}`));
              setModalVisible(false);
              Alert.alert('Terhapus', 'Data pengguna berhasil dihapus.');
            } catch (error: any) {
              Alert.alert('Gagal', error.message);
            }
          }
        }
      ]
    );
  };

  const renderUser = ({ item }: { item: UserData }) => {
    const isAdmin = item.email === 'admin@gmail.com';
    return (
      <TouchableOpacity style={styles.userCard} activeOpacity={0.7} onPress={() => openEditModal(item)}>
        <View style={styles.userAvatar}>
          {item.photoBase64 ? (
            <Image source={{ uri: item.photoBase64 }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{item.email ? item.email.substring(0, 2).toUpperCase() : 'US'}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#2563EB" style={{ marginRight: 2 }} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.userDetailText}>NIK: {item.nik || '-'}</Text>
          <Text style={styles.userDetailText}>HP: {item.phone || '-'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Kelola Pengguna</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryBox}>
        <Ionicons name="people" size={20} color="#2563EB" />
        <Text style={styles.summaryText}>Total <Text style={{ fontWeight: '700' }}>{users.length}</Text> warga terdaftar</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Belum ada data pengguna.</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Detail Pengguna</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.email}</Text>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Nomor Induk Kependudukan</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="card-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Masukkan NIK"
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
                    placeholder="Masukkan nomor HP"
                    placeholderTextColor="#CBD5E1"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.saveBtnText}>Simpan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  
  // Summary
  summaryBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', marginHorizontal: 20, marginTop: 20, marginBottom: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  summaryText: { marginLeft: 10, fontSize: 14, color: '#1E3A8A' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#3B82F6' },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  userEmail: { fontSize: 15, fontWeight: '700', color: '#0F172A', flexShrink: 1, marginRight: 8 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#1E3A8A' },
  userDetailText: { fontSize: 12, color: '#64748B', marginBottom: 2 },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  modalBody: { width: '100%' },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  
  actionRow: { flexDirection: 'row', marginTop: 10, gap: 12 },
  deleteBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  saveBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#2563EB', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }
});
