import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageSourcePropType,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const logo: ImageSourcePropType = require("../assets/uniTalk.png");

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("token");

      if (token) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/login");

      }
    };

    const timer = setTimeout(checkAuth, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={logo}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebe4e4",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 190,
    height: 190,
  },
});