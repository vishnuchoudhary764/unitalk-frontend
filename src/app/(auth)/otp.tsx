import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import BASE_URL from "@/src/config/api";

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtpHandler = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "OTP verification failed");
        setLoading(false);
        return;
      }
      else{
        alert("OTP verified")
      }

      // ✅ OTP verified
     router.replace({
  pathname: "/(auth)/signup",
  params: { email },
});


    } catch{
      Alert.alert("Error", "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "600", alignSelf: "center", marginBottom: 10 }}>
        Verify OTP
      </Text>

      <Text style={{ color: "#666", marginBottom: 15, alignSelf: "center" }}>
        Enter the 6-digit code sent to your email
      </Text>

      <TextInput
        placeholder="------"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 14,
          fontSize: 18,
          textAlign: "center",
          letterSpacing: 12,
          borderRadius: 16,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={otp.length !== 6 || loading}
        onPress={verifyOtpHandler}
        style={{
          backgroundColor: otp.length !== 6 ? "#CBD5E1" : "#2563EB",
          height: 52,
          borderRadius: 16,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
          {loading ? "Verifying..." : "Verify & Continue"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}