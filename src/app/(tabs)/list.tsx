import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated } from 'react-native';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update, push, set } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

// Komponen Kartu dengan Animasi DKV (Staggered Waterfall)
const AnimatedTicketCard = ({ item, index, isAdmin, onPress, getStatusConfig }: any) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay: index * 120, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, tension: 40, delay: index * 120, useNativeDriver: true })
    ]).start();
  }, []);

  const statusCfg = getStatusConfig(item.status);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <View style={styles.reporterInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={12} color="#6B7280" />
            </View>
            <Text style={styles.namaPelapor} numberOfLines={1}>{item.nama}</Text>
          </View>
          <Text style={styles.tanggal}>
            {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        
        <View style={styles.ticketBody}>
          <Text style={styles.judul}>{item.judul}</Text>
          <Text style={styles.isi}>{item.isi}</Text>
        </View>
        
        <View style={styles.ticketFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{item.status || 'Menunggu'}</Text>
          </View>

          <View style={styles.adminActionHint}>
            <Text style={styles.actionHintText}>{isAdmin ? 'Lihat & Kelola' : 'Lacak Progres'}</Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ListScreen() {
  const [pengaduanList, setPengaduanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';

  // Header Animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();

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
    if (status === 'Selesai') return { bg: '#DCFCE7', color: '#059669', icon: 'checkmark-circle' };
    if (status === 'Diproses') return { bg: '#DBEAFE', color: '#2563EB', icon: 'sync-circle' };
    return { bg: '#FEF3C7', color: '#D97706', icon: 'time' };
  };

  const pendingCount = pengaduanList.filter(p => p.status === 'Menunggu').length;

  return (
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{isAdmin ? 'Portal Admin' : 'Direktori Publik'}</Text>
              <Text style={styles.subtitle}>{isAdmin ? 'Pusat Kendali Pengaduan Publik' : 'Transparansi laporan masyarakat'}</Text>
            </View>
          </Animated.View>

          {!loading && (
            <Animated.View style={[styles.statsContainer, { opacity: headerOpacity }]}>
              <View style={styles.statBox}>
                <Ionicons name="document-text" size={22} color="#0A2540" style={styles.statIcon} />
                <View>
                  <Text style={styles.statNumber}>{pengaduanList.length}</Text>
                  <Text style={styles.statLabel}>Total Publik</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle" size={22} color="#D97706" style={styles.statIcon} />
                <View>
                  <Text style={[styles.statNumber, { color: '#D97706' }]}>{pendingCount}</Text>
                  <Text style={[styles.statLabel, { color: '#B45309' }]}>Menunggu</Text>
                </View>
              </View>
            </Animated.View>
          )}

          <View style={styles.listWrapper}>
            {loading ? (
              <ActivityIndicator size="large" color="#0A2540" style={{ marginTop: 80 }} />
            ) : (
              <FlatList
                data={pengaduanList}
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
                    <Ionicons name="shield-checkmark" size={56} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Semua Terkendali</Text>
                    <Text style={styles.emptyText}>Belum ada laporan publik yang masuk ke sistem saat ini.</Text>
                  </View>
                }
              />
            )}
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900', color: '#0A2540', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#1E3A8A', marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
  
  statsContainer: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  statBox: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 14, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.03, shadowRadius:8
  },
  statIcon: { marginRight: 10 },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#0A2540', lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  listWrapper: { flex: 1 },
  flatListContent: { paddingBottom: 100 }, // Add padding for TabBar
  
  ticketCard: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 20, 
    marginBottom: 16,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F9FAFB'
  },
  ticketHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  reporterInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  namaPelapor: { fontSize: 13, color: '#4B5563', fontWeight: '700', flexShrink: 1 },
  tanggal: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  
  ticketBody: { padding: 16 },
  judul: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6, lineHeight: 22 },
  isi: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  
  ticketFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
    paddingTop: 0
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  adminActionHint: { flexDirection: 'row', alignItems: 'center' },
  actionHintText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginRight: 4 },

  emptyContainer: { alignItems: 'center', marginTop: 40, backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0A2540', marginTop: 16, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 22 }
});
