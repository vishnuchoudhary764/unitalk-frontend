import { useState } from "react";
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import BASE_URL from "@/src/config/api";

const logo = require("../../assets/uniTalk.png");

// RTU email validation — frontend only
const isRTUEmail = (email: string) =>
  /^[a-z]+\.[0-9]{2}[a-z]+[0-9]{3}@rtu\.ac\.in$/.test(email.toLowerCase());

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = isRTUEmail(email);

  const handleContinue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Something went wrong");
        return;
      }

      router.push({ pathname: "/(auth)/signup", params: { email: email.toLowerCase() } });
    } catch {
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
        <Image source={logo} resizeMode="contain" style={styles.logo} />

        <Text style={styles.label}>College Email</Text>
        <TextInput
          placeholder="john.21bca001@rtu.ac.in"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, email.length > 0 && !valid && styles.inputError]}
        />

        {/* Inline error — only shown after user starts typing */}
        {email.length > 0 && !valid && (
          <Text style={styles.errorText}>
            Enter a valid RTU email — e.g. john.21bca001@rtu.ac.in
          </Text>
        )}

        <Text style={styles.helper}>Only RTU college emails are allowed</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!valid || loading}
          onPress={handleContinue}
          style={[styles.button, (!valid || loading) && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{" "}
            <Text style={styles.loginLinkBold}>Login</Text>
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
    alignSelf: "center",
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 8,
    marginLeft: 4,
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

  inputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },

  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 4,
  },

  helper: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
    marginBottom: 24,
    marginLeft: 4,
  },

  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  loginLink: {
    alignSelf: "center",
    marginTop: 20,
  },

  loginLinkText: {
    fontSize: 14,
    color: "#64748B",
  },

  loginLinkBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
});