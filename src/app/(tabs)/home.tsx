import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

const CATEGORIES = [
  { name: 'Infrastruktur', id: 'Infrastruktur', icon: 'business', color: '#3B82F6', bg: '#EFF6FF' },
  { name: 'Pelayanan', id: 'Pelayanan Publik', icon: 'people', color: '#8B5CF6', bg: '#F5F3FF' },
  { name: 'Keamanan', id: 'Keamanan', icon: 'shield-checkmark', color: '#EF4444', bg: '#FEF2F2' },
  { name: 'Kebersihan', id: 'Kebersihan', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  const theme = Colors.light;

  const user = auth.currentUser;
  const isAdmin = user?.email === 'admin@gmail.com';
  const userName = isAdmin ? 'Admin' : (user?.displayName || user?.email?.split('@')[0] || 'Warga');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      const unsubUser = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.photoBase64) setUserAvatar(data.photoBase64);
      });

      const notifRef = ref(database, 'notifications');
      const unsubNotif = onValue(notifRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const count = Object.values(data).filter((n: any) => 
            !n.read && (n.userId === user.email || n.userId === user.displayName)
          ).length;
          setUnreadNotif(count);
        }
      });

      return () => { unsubUser(); unsubNotif(); };
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

    const fetchDismissed = async () => {
      try {
        const val = await AsyncStorage.getItem('dismissedAnnouncements');
        if (val) setDismissedAnnouncements(JSON.parse(val));
      } catch (e) {}
    };
    fetchDismissed();

    const annRef = ref(database, 'announcements');
    const unsubAnn = onValue(annRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        const activeList = list.filter(item => item.active);
        activeList.sort((a, b) => b.timestamp - a.timestamp);
        if (activeList.length > 0) {
          setAnnouncement(activeList[0]);
        } else {
          setAnnouncement(null);
        }
      } else {
        setAnnouncement(null);
      }
    });

    return () => { unsubscribe(); unsubAnn(); };
  }, []);

  const getStatusStyle = (status: string) => {
    if (status === 'Selesai') return { color: '#16A34A', bg: '#F0FDF4' };
    if (status === 'Diproses') return { color: '#2563EB', bg: '#EFF6FF' };
    return { color: '#CA8A04', bg: '#FEFCE8' };
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const myReports = reports.filter(r => r.email === user?.email || r.nama === user?.email);
  const userCounts = {
    total: myReports.length,
    menunggu: myReports.filter(r => r.status === 'Menunggu').length,
    diproses: myReports.filter(r => r.status === 'Diproses').length,
    selesai: myReports.filter(r => r.status === 'Selesai').length,
  };

  const adminCounts = {
    total: reports.length,
    menunggu: reports.filter(r => r.status === 'Menunggu').length,
    diproses: reports.filter(r => r.status === 'Diproses').length,
    selesai: reports.filter(r => r.status === 'Selesai').length,
  };

  const recentReports = isAdmin 
    ? reports.filter(r => r.status === 'Menunggu').slice(0, 5)
    : reports.slice(0, 6);

  const handleDismissAnnouncement = async () => {
    if (!announcement) return;
    const newList = [...dismissedAnnouncements, announcement.id];
    setDismissedAnnouncements(newList);
    try {
      await AsyncStorage.setItem('dismissedAnnouncements', JSON.stringify(newList));
    } catch (e) {}
  };

  const renderAnnouncementBanner = () => {
    if (!announcement || dismissedAnnouncements.includes(announcement.id)) return null;

    let bg = '#EFF6FF', border = '#DBEAFE', iconColor = '#2563EB', icon = 'information-circle';
    if (announcement.type === 'warning') { bg = '#FEF3C7'; border = '#FDE68A'; iconColor = '#D97706'; icon = 'warning'; }
    if (announcement.type === 'danger') { bg = '#FEF2F2'; border = '#FECACA'; iconColor = '#DC2626'; icon = 'alert-circle'; }

    return (
      <View style={[s.announcementBanner, { backgroundColor: bg, borderColor: border }]}>
        <View style={s.announcementIconBox}>
          <Ionicons name={icon as any} size={24} color={iconColor} />
        </View>
        <View style={s.announcementTextContainer}>
          <Text style={[s.announcementTitle, { color: iconColor }]}>{announcement.title}</Text>
          <Text style={s.announcementMessage}>{announcement.message}</Text>
        </View>
        <TouchableOpacity style={s.announcementCloseBtn} onPress={handleDismissAnnouncement}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    );
  };

  // ======== ADMIN VIEW ========
  if (isAdmin) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={s.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greeting()},</Text>
              <Text style={s.userName}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarBtn}>
              <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {renderAnnouncementBanner()}

          <LinearGradient colors={['#1E3A8A', '#2563EB']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.adminBanner}>
            <View style={s.adminBannerTop}>
              <View>
                <Text style={s.adminBannerLabel}>Total Laporan Masuk</Text>
                <Text style={s.adminBannerNum}>{adminCounts.total}</Text>
              </View>
              <TouchableOpacity style={s.adminBannerBtn} onPress={() => router.push('/(tabs)/list')}>
                <Text style={s.adminBannerBtnText}>Kelola</Text>
                <Ionicons name="arrow-forward" size={14} color="#1E3A8A" />
              </TouchableOpacity>
            </View>
            <View style={s.adminBannerStats}>
              <View style={s.adminBannerStatItem}>
                <View style={[s.adminBannerDot, { backgroundColor: '#FCD34D' }]} />
                <Text style={s.adminBannerStatText}>{adminCounts.menunggu} Menunggu</Text>
              </View>
              <View style={s.adminBannerStatItem}>
                <View style={[s.adminBannerDot, { backgroundColor: '#60A5FA' }]} />
                <Text style={s.adminBannerStatText}>{adminCounts.diproses} Diproses</Text>
              </View>
              <View style={s.adminBannerStatItem}>
                <View style={[s.adminBannerDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={s.adminBannerStatText}>{adminCounts.selesai} Selesai</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Perlu Tindakan</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/list')}>
              <Text style={s.seeAll}>Semua →</Text>
            </TouchableOpacity>
          </View>

          {recentReports.length > 0 ? (
            <View style={s.listCard}>
              {recentReports.map((item, i) => {
                const st = getStatusStyle(item.status);
                return (
                  <TouchableOpacity key={item.id} style={[s.listItem, i < recentReports.length - 1 && s.listItemBorder]} onPress={() => router.push(`/report/${item.id}`)} activeOpacity={0.6}>
                    <View style={s.listItemLeft}>
                      <View style={s.listItemAvatar}>
                        <Text style={s.listItemAvatarText}>{(item.nama || 'U')[0].toUpperCase()}</Text>
                      </View>
                      <View style={s.listItemInfo}>
                        <Text style={s.listItemTitle} numberOfLines={1}>{item.judul}</Text>
                        <Text style={s.listItemSub} numberOfLines={1}>{item.nama} · {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="checkmark-done-circle" size={32} color="#10B981" />
              <Text style={s.emptyText}>Semua laporan sudah ditindaklanjuti!</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ======== USER VIEW ========
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={s.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.userName}>{userName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {unreadNotif > 0 && (
              <View style={s.notifBadge}>
                <Ionicons name="notifications" size={18} color="#64748B" />
                <View style={s.notifDot}>
                  <Text style={s.notifDotText}>{unreadNotif > 9 ? '9+' : unreadNotif}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarBtn}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={s.avatarImg} />
              ) : user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={s.avatarImg} />
              ) : (
                <Ionicons name="person" size={18} color="#475569" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {renderAnnouncementBanner()}

        {/* CTA Banner */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/main')}>
          <LinearGradient colors={['#1E40AF', '#3B82F6']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.ctaBanner}>
            <View style={s.ctaContent}>
              <Text style={s.ctaTitle}>Ada Keluhan?</Text>
              <Text style={s.ctaDesc}>Sampaikan laporan Anda agar dapat segera ditindaklanjuti.</Text>
            </View>
            <View style={s.ctaButton}>
              <Ionicons name="add" size={22} color="#1E40AF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Strip */}
        <View style={s.statsStrip}>
          <View style={s.statsStripItem}>
            <Text style={s.statsStripNum}>{userCounts.total}</Text>
            <Text style={s.statsStripLabel}>Laporan</Text>
          </View>
          <View style={s.statsStripDivider} />
          <View style={s.statsStripItem}>
            <Text style={s.statsStripNum}>{userCounts.menunggu}</Text>
            <Text style={s.statsStripLabel}>Menunggu</Text>
          </View>
          <View style={s.statsStripDivider} />
          <View style={s.statsStripItem}>
            <Text style={s.statsStripNum}>{userCounts.diproses}</Text>
            <Text style={s.statsStripLabel}>Diproses</Text>
          </View>
          <View style={s.statsStripDivider} />
          <View style={s.statsStripItem}>
            <Text style={s.statsStripNum}>{userCounts.selesai}</Text>
            <Text style={s.statsStripLabel}>Selesai</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Kategori</Text>
        </View>
        <View style={s.catGrid}>
          {CATEGORIES.map((cat, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={s.catItem} 
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(tabs)/list', params: { category: cat.id } })}
            >
              <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <Text style={s.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Reports */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Laporan Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/list')}>
            <Text style={s.seeAll}>Semua →</Text>
          </TouchableOpacity>
        </View>

        {recentReports.length > 0 ? (
          <View style={s.listCard}>
            {recentReports.map((item, i) => {
              const st = getStatusStyle(item.status);
              return (
                <TouchableOpacity key={item.id} style={[s.listItem, i < recentReports.length - 1 && s.listItemBorder]} onPress={() => router.push(`/report/${item.id}`)} activeOpacity={0.6}>
                  <View style={s.listItemLeft}>
                    <View style={s.listItemAvatar}>
                      <Text style={s.listItemAvatarText}>{(item.nama || 'U')[0].toUpperCase()}</Text>
                    </View>
                    <View style={s.listItemInfo}>
                      <Text style={s.listItemTitle} numberOfLines={1}>{item.judul}</Text>
                      <Text style={s.listItemSub} numberOfLines={1}>
                        {item.kategori || 'Umum'} · {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.statusChip, { backgroundColor: st.bg }]}>
                    <Text style={[s.statusChipText, { color: st.color }]}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#CBD5E1" />
            <Text style={s.emptyText}>Belum ada laporan</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 36 : 12, paddingBottom: 100 },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  notifBadge: { position: 'relative' },
  notifDot: { position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifDotText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // Announcement Banner
  announcementBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 16 },
  announcementIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  announcementTextContainer: { flex: 1, paddingRight: 8 },
  announcementTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  announcementMessage: { fontSize: 13, color: '#475569', lineHeight: 18 },
  announcementCloseBtn: { padding: 4 },

  // CTA Banner
  ctaBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 16 },
  ctaContent: { flex: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  ctaDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  ctaButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },

  // Admin Banner
  adminBanner: { borderRadius: 16, padding: 18, marginBottom: 20 },
  adminBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  adminBannerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  adminBannerNum: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  adminBannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  adminBannerBtnText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  adminBannerStats: { flexDirection: 'row', gap: 16 },
  adminBannerStatItem: { flexDirection: 'row', alignItems: 'center' },
  adminBannerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  adminBannerStatText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Stats Strip
  statsStrip: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 14, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  statsStripItem: { flex: 1, alignItems: 'center' },
  statsStripDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  statsStripNum: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 1 },
  statsStripLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  // Section
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  // Categories
  catGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  catItem: { alignItems: 'center', width: '23%' },
  catIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  catName: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },

  // List Card
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  listItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  listItemAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listItemAvatarText: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  listItemInfo: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  listItemSub: { fontSize: 12, color: '#94A3B8' },

  // Status Chip
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#FAFAFA', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed' },
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginTop: 6 },
});
