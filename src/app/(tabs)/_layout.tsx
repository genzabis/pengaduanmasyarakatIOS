import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View, TouchableOpacity, Modal, Text, Pressable, Alert } from 'react-native';
import { auth } from '../../../firebaseConfig';

export default function TabLayout() {
  const [logoutVisible, setLogoutVisible] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLogoutVisible(false);
    await auth.signOut();
    router.replace('/login');
  };

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.labelStyle,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            {Platform.OS === 'ios' ? (
              <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
            )}
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => (
            <Ionicons name={color === '#2563EB' ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="main"
        options={{
          title: 'Lapor',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={color === '#2563EB' ? "megaphone" : "megaphone-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Direktori',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={color === '#2563EB' ? "folder-open" : "folder-open-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Pesan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={color === '#2563EB' ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={color === '#2563EB' ? "notifications" : "notifications-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={color === '#2563EB' ? "person-circle" : "person-circle-outline"} size={24} color={color} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onLongPress={() => setLogoutVisible(true)}
              delayLongPress={500}
            />
          ),
        }}
      />
    </Tabs>

    {/* Logout Modal */}
    <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setLogoutVisible(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalIconWrap}>
            <Ionicons name="log-out-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.modalTitle}>Keluar dari Akun?</Text>
          <Text style={styles.modalDesc}>Anda perlu login kembali untuk mengakses aplikasi.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogoutVisible(false)}>
              <Text style={styles.modalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalLogoutText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    height: Platform.OS === 'ios' ? 88 : 64,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  labelStyle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // Logout Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: 300, alignItems: 'center' },
  modalIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  modalDesc: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalLogoutBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  modalLogoutText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
