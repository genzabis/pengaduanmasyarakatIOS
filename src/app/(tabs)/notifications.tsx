import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
        
        // Filter untuk pengguna saat ini saja
        const userNotifs = formattedData.filter(n => n.userId === currentUserEmail);
        
        // Urutkan dari yang terbaru
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
    
    // Batch update di Firebase RTDB
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
      case 'success': return { name: 'checkmark-circle', color: '#10B981', bg: '#D1FAE5' };
      case 'processing': return { name: 'time', color: '#F59E0B', bg: '#FEF3C7' };
      case 'info': return { name: 'document-text', color: '#3B82F6', bg: '#DBEAFE' };
      case 'system': return { name: 'warning', color: '#EF4444', bg: '#FEE2E2' };
      default: return { name: 'notifications', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>Tandai dibaca</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#0A2540" style={{ marginTop: 80 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Kosong Melompong</Text>
            <Text style={styles.emptyText}>Anda belum memiliki notifikasi apapun saat ini.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {notifications.map((notif) => {
              const iconInfo = getIcon(notif.type);
              return (
                <TouchableOpacity key={notif.id} style={[styles.card, !notif.read && styles.cardUnread]} activeOpacity={0.7}>
                  {!notif.read && <View style={styles.unreadDot} />}
                  <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
                    <Ionicons name={iconInfo.name as any} size={26} color={iconInfo.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, !notif.read && styles.textUnread]} numberOfLines={1}>{notif.title}</Text>
                      <Text style={[styles.cardTime, !notif.read && styles.timeUnread]}>{formatTime(notif.time)}</Text>
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={2}>{notif.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={styles.footerSpace} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Very clean modern app background
  },
  header: {
    paddingTop: 68, // Account for iOS status bar
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0A2540',
    letterSpacing: -0.5,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardUnread: {
    backgroundColor: '#F4F8FF', // subtle blue tint for unread
    borderColor: '#D1E0FF',
    shadowOpacity: 0.08,
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginLeft: 4,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  textUnread: {
    color: '#0A2540',
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timeUnread: {
    color: '#3B82F6',
  },
  cardMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '500',
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0A2540', 
    marginTop: 16, 
    marginBottom: 8 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#6B7280', 
    fontSize: 14, 
    lineHeight: 22,
    paddingHorizontal: 40
  },
  footerSpace: {
    height: 120, // ample space so the bottom notification isn't hidden by the floating tab bar
  }
});
