import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedTicketCard = ({ item, index, onPress, getStatusConfig }: any) => {
  const translateY = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true })
    ]).start();
  }, []);

  const statusCfg = getStatusConfig(item.status);

  // Map category to a simple icon
  const getCatIcon = (cat: string) => {
    if (!cat) return 'folder-outline';
    if (cat.toLowerCase().includes('infrastruktur')) return 'business';
    if (cat.toLowerCase().includes('kebersihan')) return 'trash-bin';
    if (cat.toLowerCase().includes('pelayanan')) return 'people';
    if (cat.toLowerCase().includes('keamanan')) return 'shield-checkmark';
    return 'document-text';
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.6} onPress={onPress} style={styles.compactCard}>
        
        {/* Left Icon (Category) */}
        <View style={styles.iconColumn}>
          <Text style={styles.listNumber}>{index + 1}</Text>
          <View style={styles.catIconWrap}>
            <Ionicons name={getCatIcon(item.kategori) as any} size={20} color="#64748B" />
          </View>
        </View>

        {/* Center Content (Title & Name) */}
        <View style={styles.centerColumn}>
          <Text style={styles.judul} numberOfLines={1}>{item.judul}</Text>
          <View style={styles.nameRow}>
            <Ionicons name="person-circle-outline" size={14} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.namaPelapor} numberOfLines={1}>{item.nama}</Text>
          </View>
        </View>

        {/* Right Content (Date & Status Dot) */}
        <View style={styles.rightColumn}>
          <Text style={styles.tanggal}>
            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
          </Text>
          <View style={[styles.compactStatusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{item.status}</Text>
          </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ListScreen() {
  const [pengaduanList, setPengaduanList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();
  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.filter) {
      setFilterStatus(params.filter as string);
    }
    if (params.category) {
      setFilterKategori(params.category as string);
    }
  }, [params.filter, params.category]);

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const pengaduanRef = ref(database, 'pengaduan');
    const unsubscribe = onValue(pengaduanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        const filteredData = isAdmin ? formattedData : formattedData.filter(item => item.nama === auth.currentUser?.email);
        setPengaduanList(filteredData);
      } else {
        setPengaduanList([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = (item: any) => {
    router.push(`/report/${item.id}`);
  };

  const getStatusConfig = (status: string) => {
    if (status === 'Selesai') return { bg: '#F0FDF4', color: '#16A34A', border: '#DCFCE7' };
    if (status === 'Diproses') return { bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' };
    return { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' };
  };

  const FILTERS = [
    { label: 'Semua', icon: 'apps' },
    { label: 'Menunggu', icon: 'time' },
    { label: 'Diproses', icon: 'sync' },
    { label: 'Selesai', icon: 'checkmark-circle' },
  ];

  const CATEGORIES = [
    { label: 'Semua Kategori', id: 'Semua' },
    { label: 'Infrastruktur', id: 'Infrastruktur' },
    { label: 'Kebersihan', id: 'Kebersihan' },
    { label: 'Pelayanan Publik', id: 'Pelayanan Publik' },
    { label: 'Keamanan', id: 'Keamanan' },
    { label: 'Lainnya', id: 'Lainnya' },
  ];

  const pendingCount = pengaduanList.filter(p => p.status === 'Menunggu').length;

  const displayList = pengaduanList.filter(item => {
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    const matchCategory = filterKategori === 'Semua' || item.kategori === filterKategori;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      (item.judul && item.judul.toLowerCase().includes(searchLower)) ||
      (item.isi && item.isi.toLowerCase().includes(searchLower)) ||
      (item.nama && item.nama.toLowerCase().includes(searchLower));
    return matchStatus && matchCategory && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.title}>{isAdmin ? 'Direktori Laporan' : 'Riwayat Laporan'}</Text>
          <Text style={styles.subtitle}>{isAdmin ? 'Pusat pantauan data pengaduan publik.' : 'Pantau perkembangan status laporan Anda.'}</Text>
        </Animated.View>

        {!loading && isAdmin && (
          <Animated.View style={{ opacity: headerOpacity }}>
            <LinearGradient
              colors={['#1E3A8A', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsContainer}
            >
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TOTAL LAPORAN</Text>
                <Text style={styles.statNumber}>{pengaduanList.length}</Text>
              </View>
              <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.statLabel}>PERLU DIPROSES</Text>
                <Text style={[styles.statNumber, { color: '#FCD34D' }]}>{pendingCount}</Text>
              </View>
              <Ionicons name="pie-chart" size={80} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
            </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari laporan atau nama..."
            placeholderTextColor="#CBD5E1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterScroll} style={{ marginBottom: 10 }}>
            {CATEGORIES.map((item) => {
              const isActive = filterKategori === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                  onPress={() => setFilterKategori(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterScroll}>
            {FILTERS.map((item) => {
              const isActive = filterStatus === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                  onPress={() => setFilterStatus(item.label)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={14} color={isActive ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listWrapper}>
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 60 }} />
          ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.flatListContent}
                renderItem={({ item, index }) => (
                  <AnimatedTicketCard 
                    item={item} 
                    index={index} 
                    onPress={() => handleUpdateStatus(item)} 
                    getStatusConfig={getStatusConfig} 
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={64} color="#E2E8F0" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyTitle}>Tidak Ada Data</Text>
                    <Text style={styles.emptyText}>Belum ada laporan yang sesuai dengan kriteria pencarian ini.</Text>
                  </View>
                }
              />
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' }, // Back to white to support compact lists
  content: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B', fontWeight: '400' },
  
  statsContainer: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  statBox: { flex: 1, padding: 16, justifyContent: 'center', zIndex: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: 1 },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },

  listWrapper: { flex: 1 },
  flatListContent: { paddingBottom: 110 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  searchFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', height: '100%' },
  clearSearchBtn: { padding: 4 },

  filtersWrapper: { marginBottom: 16, marginHorizontal: -20 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  
  /* Compact List Styles */
  compactCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconColumn: { marginRight: 14, flexDirection: 'row', alignItems: 'center' },
  listNumber: { fontSize: 13, fontWeight: '700', color: '#94A3B8', width: 20, textAlign: 'center', marginRight: 8 },
  catIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  centerColumn: { flex: 1, justifyContent: 'center' },
  judul: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4, paddingRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  namaPelapor: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  rightColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  tanggal: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6 },
  
  compactStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', marginTop: 60, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14, lineHeight: 22 }
});
