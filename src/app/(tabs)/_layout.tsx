import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View, Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false, // Disable default label to use our ultra-precise custom label
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            {Platform.OS === 'ios' ? (
              <BlurView tint="light" intensity={100} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]} />
            )}
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="main"
        options={{
          title: 'Lapor',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? "document-text" : "document-text-outline"} size={22} color={focused ? '#0A2540' : '#6B7280'} />
              </View>
              <Text style={[styles.customLabel, { color: focused ? '#0A2540' : '#6B7280' }]}>Lapor</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Direktori',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? "albums" : "albums-outline"} size={22} color={focused ? '#0A2540' : '#6B7280'} />
              </View>
              <Text style={[styles.customLabel, { color: focused ? '#0A2540' : '#6B7280' }]}>Direktori</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={focused ? '#0A2540' : '#6B7280'} />
              </View>
              <Text style={[styles.customLabel, { color: focused ? '#0A2540' : '#6B7280' }]}>Notifikasi</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItemContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons name={focused ? "person" : "person-outline"} size={22} color={focused ? '#0A2540' : '#6B7280'} />
              </View>
              <Text style={[styles.customLabel, { color: focused ? '#0A2540' : '#6B7280' }]}>Profil</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    elevation: 8,
    backgroundColor: 'transparent',
    height: 64,
    borderTopWidth: 0,
    paddingTop: 0,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.8)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 12 : 0, 
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64, // Fixed width suitable for 4 tabs
  },
  iconWrapper: {
    width: 56,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(10, 37, 64, 0.08)',
  },
  customLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 3,
  }
});
