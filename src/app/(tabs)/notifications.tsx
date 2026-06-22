import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const notifRef = ref(database, 'notifications');
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentUserEmail = auth.currentUser?.email;
        const formattedData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        const userNotifs = formattedData.filter(n => n.userId === currentUserEmail);
        userNotifs.sort((a, b) => b.time - a.time);
        
        setNotifications(userNotifs);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;
    
    const updates: any = {};
    unreadNotifs.forEach(n => {
      updates[`notifications/${n.id}/read`] = true;
    });
    
    try {
      await update(ref(database), updates);
    } catch (error) {
      console.log('Error marking as read:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Baru saja';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} m lalu`;
    if (diffHrs < 24) return `${diffHrs} j lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} h lalu`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return { name: 'checkmark-circle-outline', color: '#16A34A', bg: '#F0FDF4' };
      case 'processing': return { name: 'sync-outline', color: '#2563EB', bg: '#EFF6FF' };
      case 'info': return { name: 'information-circle-outline', color: '#0F172A', bg: '#F8FAFC' };
      case 'system': return { name: 'warning-outline', color: '#DC2626', bg: '#FEF2F2' };
      default: return { name: 'notifications-outline', color: '#64748B', bg: '#F8FAFC' };
    }
  };

  // Strip emojis to keep it professional as requested
  const stripEmoji = (text: string) => {
    if (!text) return '';
    return text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifikasi</Text>
            <Text style={styles.headerSubtitle}>Pembaruan terbaru untuk Anda</Text>
          </View>
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done" size={16} color="#2563EB" />
            <Text style={styles.markAllRead}>Tandai dibaca</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 80 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Kosong</Text>
              <Text style={styles.emptyText}>Belum ada pemberitahuan baru.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {notifications.map((notif) => {
                const iconInfo = getIcon(notif.type);
                const isUnread = !notif.read;
                return (
                  <TouchableOpacity key={notif.id} style={[styles.card, isUnread && styles.cardUnread]} activeOpacity={0.7}>
                    <View style={[styles.iconBox, { backgroundColor: isUnread ? iconInfo.bg : '#F8FAFC' }]}>
                      <Ionicons name={iconInfo.name as any} size={22} color={isUnread ? iconInfo.color : '#94A3B8'} />
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, isUnread && styles.textUnread]} numberOfLines={1}>
                          {stripEmoji(notif.title)}
                        </Text>
                        <Text style={[styles.cardTime, isUnread && styles.timeUnread]}>
                          {formatTime(notif.time)}
                        </Text>
                      </View>
                      <Text style={[styles.cardMessage, isUnread && styles.msgUnread]} numberOfLines={2}>
                        {stripEmoji(notif.message)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.footerSpace} />
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  markAllRead: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 6,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardUnread: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  textUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  timeUnread: {
    color: '#64748B',
    fontWeight: '600',
  },
  cardMessage: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    fontWeight: '400',
  },
  msgUnread: {
    color: '#475569',
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#0F172A', 
    marginTop: 16, 
    marginBottom: 8 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#64748B', 
    fontSize: 14, 
    paddingHorizontal: 40
  },
  footerSpace: {
    height: 100,
  }
});
