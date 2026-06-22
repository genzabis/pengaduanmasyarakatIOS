import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';

const CATEGORIES = [
  { name: 'Infrastruktur', id: 'Infrastruktur', icon: 'business', color: '#3B82F6', bg: '#EFF6FF' },
  { name: 'Pelayanan Publik', id: 'Pelayanan Publik', icon: 'people', color: '#8B5CF6', bg: '#F5F3FF' },
  { name: 'Keamanan', id: 'Keamanan', icon: 'shield-checkmark', color: '#EF4444', bg: '#FEF2F2' },
  { name: 'Kebersihan', id: 'Kebersihan', icon: 'trash-bin', color: '#10B981', bg: '#ECFDF5' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const userName = user?.email?.split('@')[0] || 'Warga';
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      const unsubUser = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.photoBase64) {
          setUserAvatar(data.photoBase64);
        }
      });
      return () => unsubUser();
    }
  }, [user]);

  useEffect(() => {
    const reportsRef = ref(database, 'pengaduan');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setReports(parsed.sort((a, b) => b.tanggal - a.tanggal));
      } else {
        setReports([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const myReports = reports.filter(r => r.email === user?.email);
  const statusCount = {
    menunggu: myReports.filter(r => r.status === 'Menunggu').length,
    diproses: myReports.filter(r => r.status === 'Diproses').length,
    selesai: myReports.filter(r => r.status === 'Selesai').length,
  };

  const recentPublicReports = reports.slice(0, 3);

  const getStatusColor = (status: string) => {
    if (status === 'Selesai') return { bg: '#F0FDF4', color: '#16A34A', border: '#DCFCE7' };
    if (status === 'Diproses') return { bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' };
    return { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' };
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Selesai') return "checkmark-circle";
    if (status === 'Diproses') return "sync-circle";
    return "time";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subGreeting}>Selamat Datang Kembali,</Text>
            <Text style={styles.greetingText}>{userName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileAvatar}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />
            ) : user?.photoURL ? (
              <Image source={{ uri: user?.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />
            ) : (
              <Ionicons name="person" size={20} color="#0F172A" />
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Banner with Gradient */}
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTextContent}>
            <Text style={styles.heroTitle}>Kawal Kota Kita</Text>
            <Text style={styles.heroDesc}>Punya keluhan soal jalan rusak atau fasilitas umum? Laporkan secara anonim & aman.</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/main')} activeOpacity={0.8}>
              <Text style={styles.heroBtnText}>Lapor Sekarang</Text>
              <Ionicons name="chevron-forward" size={16} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
          <Ionicons name="shield-checkmark" size={120} color="rgba(255,255,255,0.15)" style={styles.heroIcon} />
        </LinearGradient>

        {/* Stats Cards - Unified Clean Card */}
        <Text style={styles.sectionTitleBottom}>Aktivitas Anda</Text>
        <View style={styles.unifiedStatCard}>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="time" size={20} color="#475569" />
            </View>
            <Text style={[styles.statNum, {color: '#1E293B'}]}>{statusCount.menunggu}</Text>
            <Text style={styles.statLabel}>Menunggu</Text>
          </View>
          
          <View style={[styles.statItem, styles.statBorder]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="sync" size={20} color="#475569" />
            </View>
            <Text style={[styles.statNum, {color: '#1E293B'}]}>{statusCount.diproses}</Text>
            <Text style={styles.statLabel}>Diproses</Text>
          </View>
          
          <View style={[styles.statItem, styles.statBorder]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#475569" />
            </View>
            <Text style={[styles.statNum, {color: '#1E293B'}]}>{statusCount.selesai}</Text>
            <Text style={styles.statLabel}>Selesai</Text>
          </View>
        </View>

        {/* Categories (2x2 Grid) */}
        <Text style={styles.sectionTitleBottom}>Kategori Pengaduan</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.categoryPill} 
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(tabs)/list', params: { category: cat.id } })}
            >
              <View style={[styles.categoryPillIcon, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <Text style={styles.categoryPillText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Public Reports */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleBottom}>Pantauan Publik</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/list')}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {recentPublicReports.map((item) => {
          const statusCfg = getStatusColor(item.status);
          return (
            <TouchableOpacity key={item.id} style={styles.reportCard} onPress={() => router.push(`/report/${item.id}`)} activeOpacity={0.7}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportCategory}>{item.kategori || 'UMUM'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                  <Ionicons name={getStatusIcon(item.status) as any} size={12} color={statusCfg.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.reportTitle} numberOfLines={2}>{item.judul}</Text>
              
              <View style={styles.reportFooter}>
                <View style={styles.reportFooterItem}>
                  <Ionicons name="calendar-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text style={styles.reportDate}>
                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.reportFooterItem}>
                  <Ionicons name="person-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text style={styles.reportDate}>{item.nama}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, 
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'android' ? 40 : 24, paddingBottom: 100 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  subGreeting: { fontSize: 13, color: '#64748B', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  greetingText: { fontSize: 24, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  
  heroBanner: { borderRadius: 24, padding: 28, flexDirection: 'row', overflow: 'hidden', marginBottom: 24, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  heroTextContent: { flex: 1, zIndex: 2 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 22, marginBottom: 24, paddingRight: 20 },
  heroBtn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  heroBtnText: { color: '#1E3A8A', fontWeight: '700', fontSize: 13, marginRight: 4 },
  heroIcon: { position: 'absolute', right: -20, top: -10, zIndex: 1, transform: [{ rotate: '10deg' }] },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitleBottom: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#3B82F6', marginBottom: 16 },

  /* Unified Stats Card */
  unifiedStatCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statNum: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  /* 2x2 Category Grid */
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  categoryPill: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  categoryPillIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryPillText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },

  reportCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 3 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  reportCategory: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 10, fontWeight: '700' },
  reportTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 16, lineHeight: 22 },
  
  reportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  reportFooterItem: { flexDirection: 'row', alignItems: 'center' },
  reportDate: { fontSize: 12, color: '#64748B', fontWeight: '500' }
});
