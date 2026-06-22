import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export default function SplashScreen() {
  const router = useRouter();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 1000, 
        easing: Easing.out(Easing.ease), 
        useNativeDriver: true 
      }),
      Animated.timing(slideAnim, { 
        toValue: 0, 
        duration: 1000, 
        easing: Easing.out(Easing.ease), 
        useNativeDriver: true 
      })
    ]).start();

    // 2.5 seconds total for a clean, fast experience
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTimeout(() => {
        if (user) {
          if (user.email === 'admin@gmail.com') {
            router.replace('/(tabs)/list');
          } else {
            router.replace('/(tabs)/main');
          }
        } else {
          router.replace('/login');
        }
      }, 2500); 
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.Image 
          source={require('../../assets/app_logo.png')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>Pengaduan Masyarakat</Text>
        <Text style={styles.subtitle}>Layanan Pelaporan Publik Terpadu</Text>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', // Pure White
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: { 
    alignItems: 'center', 
    paddingHorizontal: 24 
  },
  logo: { 
    width: 140, 
    height: 140, 
    resizeMode: 'contain', 
    marginBottom: 12 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 15, 
    color: '#64748B', 
    fontWeight: '400', 
    textAlign: 'center' 
  },
  loaderContainer: {
    marginTop: 48,
    height: 20
  }
});
