import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated, ScrollView, TextInput } from 'react-native';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const AnimatedTicketCard = ({ item, index, isAdmin, onPress, getStatusConfig }: any) => {
  const translateY = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true })
    ]).start();
  }, []);

  const statusCfg = getStatusConfig(item.status);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.6} onPress={onPress} style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Text style={styles.namaPelapor} numberOfLines={1}>{item.nama}</Text>
          <Text style={styles.tanggal}>
            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        
        <View style={styles.ticketBody}>
          {item.kategori && (
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{item.kategori}</Text>
            </View>
          )}
          <Text style={styles.judul}>{item.judul}</Text>
          <Text style={styles.isi} numberOfLines={2}>{item.isi}</Text>
        </View>
        
        <View style={styles.ticketFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{item.status || 'Menunggu'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ListScreen() {
  const [pengaduanList, setPengaduanList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('Semua');
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
  }, [params.filter]);

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
        setPengaduanList(filteredData.reverse());
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
    if (status === 'Selesai') return { bg: '#F0FDF4', color: '#16A34A' };
    if (status === 'Diproses') return { bg: '#EFF6FF', color: '#2563EB' };
    return { bg: '#FEFCE8', color: '#CA8A04' };
  };

  const pendingCount = pengaduanList.filter(p => p.status === 'Menunggu').length;

  const displayList = pengaduanList.filter(item => {
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      (item.judul && item.judul.toLowerCase().includes(searchLower)) ||
      (item.isi && item.isi.toLowerCase().includes(searchLower)) ||
      (item.nama && item.nama.toLowerCase().includes(searchLower));
    return matchStatus && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.title}>{isAdmin ? 'Direktori Admin' : 'Riwayat Laporan'}</Text>
          <Text style={styles.subtitle}>{isAdmin ? 'Pusat pantauan data laporan publik.' : 'Pantau status laporan yang Anda kirim.'}</Text>
        </Animated.View>

        {!loading && isAdmin && (
          <Animated.View style={[styles.statsContainer, { opacity: headerOpacity }]}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TOTAL</Text>
              <Text style={styles.statNumber}>{pengaduanList.length}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0', borderRadius: 0 }]}>
              <Text style={styles.statLabel}>MENUNGGU</Text>
              <Text style={[styles.statNumber, { color: '#CA8A04' }]}>{pendingCount}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari laporan, nama, atau isi..."
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

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['Semua', 'Menunggu', 'Diproses', 'Selesai'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
                onPress={() => setFilterStatus(status)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listWrapper}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 40 }} />
          ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              renderItem={({ item, index }) => (
                <AnimatedTicketCard 
                  item={item} 
                  index={index} 
                  isAdmin={isAdmin} 
                  onPress={() => handleUpdateStatus(item)} 
                  getStatusConfig={getStatusConfig} 
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Kosong</Text>
                  <Text style={styles.emptyText}>Belum ada data laporan saat ini.</Text>
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
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400', lineHeight: 22 },
  
  statsContainer: { 
    flexDirection: 'row', 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12,
    backgroundColor: '#F8FAFC'
  },
  statBox: { 
    flex: 1, 
    padding: 16, 
    justifyContent: 'center',
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#0F172A' },

  listWrapper: { flex: 1 },
  flatListContent: { paddingBottom: 110 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', height: '100%' },
  clearSearchBtn: { padding: 4 },

  filterContainer: { marginBottom: 16, marginHorizontal: -24 },
  filterScroll: { paddingHorizontal: 24, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  
  ticketCard: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  namaPelapor: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1, marginRight: 16 },
  tanggal: { fontSize: 12, color: '#94A3B8' },
  
  ticketBody: { padding: 16 },
  catBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  catText: { fontSize: 10, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  judul: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  isi: { fontSize: 14, color: '#64748B', lineHeight: 22 },
  
  ticketFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    paddingTop: 0
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', marginTop: 40, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 15 }
});
