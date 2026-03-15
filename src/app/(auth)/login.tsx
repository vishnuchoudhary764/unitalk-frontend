import { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import BASE_URL from "@/src/config/api";
const logo = require("../../assets/uniTalk.png");

import AsyncStorage from "@react-native-async-storage/async-storage";


export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6;

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      // ❌ pehle check karo
      if (!res.ok) {
        Alert.alert(
          "Login failed",
          data.message || "Invalid email or password"
        );
        return;
      }

      // ✅ success case
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          gender: data.user.gender,
          profilePic: data.user.profilePic,
        })
      );
      Alert.alert("Success", "Logged in successfully");

      // ✅ redirect ONLY here
      router.replace("/(tabs)/home");

    } catch (err) {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View>
        {/* Title */}
        <Image
          source={logo}
          resizeMode="contain"
          style={styles.logo}
        />

        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity
          disabled={!isValid || loading}
          onPress={handleLogin}
          style={[
            styles.button,
            (!isValid || loading) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/email")}
          style={{ marginTop: 18, alignItems: "center" }}
        >
          <Text style={{ color: "#2563EB" }}>
            Don’t have an account? <Text style={{ fontWeight: "600" }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logo: {
    width: 190,
    height: 190,
    alignSelf: "center",   // ✅ horizontal center
    // marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    alignSelf: "center",          // ✅ horizontal center

  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 28,
    alignItems: "center",

  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },

  button: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  buttonDisabled: {
    backgroundColor: "#CBD5E1",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});