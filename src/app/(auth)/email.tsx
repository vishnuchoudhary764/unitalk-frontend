import { useState } from "react";
import BASE_URL from "@/src/config/api";

import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
const logo = require("../../assets/uniTalk.png");


export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const sendOtpHandler = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to send OTP");
        return;
      }
      else{
        alert( "OTP sent successfully");
      }

     
      router.push({
        pathname: "/otp",
        params: { email }, 
      });

    } catch{
      alert("Server not reachable");
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View>
       
        <Image
          source={logo}
          resizeMode="contain"
          style={styles.logo}
        />

      
        <Text style={styles.label}>Email address</Text>
        <TextInput
          placeholder="example@rtu.ac.in"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Text style={styles.helper}>
          We’ll send a one-time verification code to this email
        </Text>

       
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!isValidEmail}
          onPress={sendOtpHandler}
          style={[
            styles.button,
            !isValidEmail && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>Send OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{ marginTop: 18, alignItems: "center" }}
        >
          <Text style={{ color: "#2563EB", fontSize: 14 }}>
            Already have an account?{" "}
            <Text style={{ fontWeight: "600" }}>Login</Text>
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


  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    marginTop: -10,
    marginBottom: 8,
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

  helper: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
    marginBottom: 24,
  },

  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
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