import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';

const AnimatedNotifCard = ({ notif, index, getIcon, formatTime, stripEmoji, markAsRead }: any) => {
  const translateY = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true })
    ]).start();
  }, []);

  const iconInfo = getIcon(notif.type);
  const isUnread = !notif.read;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity 
        style={[styles.card, isUnread && styles.cardUnread]} 
        activeOpacity={0.7}
        onPress={() => {
          if (isUnread) markAsRead(notif.id);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: isUnread ? iconInfo.bg : '#F8FAFC' }]}>
          <Ionicons name={iconInfo.name as any} size={22} color={isUnread ? iconInfo.color : '#94A3B8'} />
          {isUnread && <View style={styles.unreadDot} />}
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
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

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

  const markAsRead = async (id: string) => {
    try {
      await update(ref(database, `notifications/${id}`), { read: true });
    } catch (error) {
      console.log('Error marking single notif as read:', error);
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
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return { name: 'checkmark-circle', color: '#16A34A', bg: '#F0FDF4' };
      case 'processing': return { name: 'sync-circle', color: '#2563EB', bg: '#EFF6FF' };
      case 'info': return { name: 'information-circle', color: '#0F172A', bg: '#F8FAFC' };
      case 'system': return { name: 'warning', color: '#DC2626', bg: '#FEF2F2' };
      default: return { name: 'notifications', color: '#64748B', bg: '#F8FAFC' };
    }
  };

  const stripEmoji = (text: string) => {
    if (!text) return '';
    return text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View>
          <Text style={styles.headerTitle}>Notifikasi</Text>
          <Text style={styles.headerSubtitle}>Pembaruan terbaru untuk Anda.</Text>
        </View>
        <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn} activeOpacity={0.7}>
          <Ionicons name="checkmark-done" size={16} color="#2563EB" />
        </TouchableOpacity>
      </Animated.View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 80 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>Kosong</Text>
            <Text style={styles.emptyText}>Belum ada pemberitahuan baru saat ini.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {notifications.map((notif, index) => (
              <AnimatedNotifCard
                key={notif.id}
                notif={notif}
                index={index}
                getIcon={getIcon}
                formatTime={formatTime}
                stripEmoji={stripEmoji}
                markAsRead={markAsRead}
              />
            ))}
            <View style={styles.footerSpace} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2
  },
  cardUnread: {
    backgroundColor: '#FAFAF9',
    borderColor: '#DBEAFE',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.06,
    elevation: 4
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2
  },
  textUnread: {
    color: '#0F172A',
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timeUnread: {
    color: '#2563EB',
    fontWeight: '700',
  },
  cardMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  msgUnread: {
    color: '#334155',
    fontWeight: '500'
  },
  emptyContainer: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
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
    height: 120,
  }
});
