import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// 1. DKV Effect: Staggered Letter Animation untuk Tipografi
const AnimatedLetter = ({ letter, index }: { letter: string, index: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      delay: 800 + (index * 40), // Jeda antar huruf
      useNativeDriver: true
    }).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
      <Text style={styles.titleLetter}>{letter === ' ' ? '\u00A0' : letter}</Text>
    </Animated.View>
  );
};

// 2. DKV Effect: Aurora / Ambient Background Blobs
const AuroraBlob = ({ color, size, top, left, delay, outputX, outputY }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 8000, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, outputX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, outputY] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  return (
    <Animated.View style={[
      styles.blob, 
      { backgroundColor: color, width: size, height: size, borderRadius: size / 2, top, left, transform: [{ translateX }, { translateY }, { scale }] }
    ]} />
  );
};

export default function SplashScreen() {
  const router = useRouter();
  
  // 3. DKV Effect: 3D Elegant Unfold Logo
  const logoRotateX = useRef(new Animated.Value(1)).current; // Dari miring ke datar
  const logoScale = useRef(new Animated.Value(0.6)).current; // Sedikit membesar
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    // Elegant Unfold
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 30, delay: 200, useNativeDriver: true }),
      Animated.spring(logoRotateX, { toValue: 0, friction: 6, tension: 20, delay: 200, useNativeDriver: true })
    ]).start(() => {
      // Continuous breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.03, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    });

    // Subtitle fade in lambat
    Animated.parallel([
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 1000, delay: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(subtitleTranslateY, { toValue: 0, duration: 1000, delay: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ]).start();

    // Selesai di 5.5 detik
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
      }, 5500); 
    });

    return unsubscribe;
  }, []);

  const rotateX = logoRotateX.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '60deg'] // Muncul dari posisi rebah ke tegak (efek buka laptop)
  });

  const combinedScale = Animated.multiply(logoScale, logoPulse);
  const words = ["PENGADUAN", "MASYARAKAT"]; // Dipisah per kata agar tidak terpotong di layar kecil

  let globalIndex = 0; // Untuk menghitung jeda staggered secara global

  return (
    <LinearGradient colors={['#F8FAFC', '#E0F2FE']} style={styles.container}>
      {/* Background Aurora */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <AuroraBlob color="rgba(186, 230, 253, 0.4)" size={width} top={-150} left={-100} delay={0} outputX={60} outputY={120} />
        <AuroraBlob color="rgba(191, 219, 254, 0.3)" size={width * 1.2} top={height * 0.3} left={width * 0.2} delay={1000} outputX={-80} outputY={-100} />
      </View>

      <View style={styles.content}>
        
        <Animated.Image 
          source={require('../../assets/app_logo.png')} 
          style={[styles.logo, { 
            opacity: logoOpacity, 
            transform: [
              { perspective: 1000 },
              { rotateX }, 
              { scale: combinedScale }
            ] 
          }]} 
        />
        
        <View style={styles.titleWrapper}>
          {words.map((word, wordIndex) => (
            <View key={wordIndex} style={styles.wordRow}>
              {word.split('').map((letter, letterIndex) => {
                const currentIndex = globalIndex++;
                return <AnimatedLetter key={currentIndex} letter={letter} index={currentIndex} />;
              })}
            </View>
          ))}
        </View>

        <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }], alignItems: 'center', marginTop: 16 }}>
          <Text style={styles.subtitle}>LAYANAN PELAPORAN PUBLIK TERPADU</Text>
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 30 }} />
        </Animated.View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  blob: { position: 'absolute', opacity: 0.5 }, // Aman untuk semua device tanpa filter blur
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  logo: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 20, zIndex: 10 },
  titleWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  wordRow: { flexDirection: 'row', marginHorizontal: 6, marginBottom: 4 }, // Pisah per kata
  titleLetter: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: '#3B82F6', letterSpacing: 2, fontWeight: '800', textAlign: 'center' }
});
