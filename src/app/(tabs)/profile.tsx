import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, pending: 0, finished: 0 });
  const [loading, setLoading] = useState(true);
  
  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';
  const userEmail = auth.currentUser?.email || 'Pengguna Tidak Dikenal';

  useEffect(() => {
    const pengaduanRef = ref(database, 'pengaduan');
    const unsubscribe = onValue(pengaduanRef, (snapshot) => {
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

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/login');
  };

  return (
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Profil Pengguna</Text>
            <Text style={styles.subtitle}>Informasi akun & keamanan</Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={36} color="#0A2540" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{isAdmin ? 'Administrator' : 'Warga Terdaftar'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Aktivitas Pelaporan Anda</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#0A2540" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Laporan</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Menunggu</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#059669' }]}>{stats.finished}</Text>
                  <Text style={styles.statLabel}>Selesai</Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#0A2540', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#1E3A8A', marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F9FAFB'
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },

  statsSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0A2540', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  statNum: { fontSize: 24, fontWeight: '900', color: '#0A2540', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#DC2626', shadowOffset: {width:0, height:4}, shadowOpacity:0.05, shadowRadius:8
  },
  logoutText: {
    marginLeft: 8,
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 15,
  }
});
