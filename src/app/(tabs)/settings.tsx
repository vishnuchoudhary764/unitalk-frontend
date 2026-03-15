import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "../../config/api";

// Height of floating BottomNav so last item is not hidden
const NAV_BOTTOM_PADDING = Platform.OS === "ios" ? 100 : 88;

interface User {
  name: string;
  email: string;
  gender: string;
  profilePic?: string;
}

type SettingItem = {
  icon: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [uploading, setUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();

    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { console.log("Profile fetch failed:", data); return; }
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch (e) { console.log("fetch profile error:", e); }
  };

  const handleChangePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setUser((prev) => prev ? { ...prev, profilePic: asset.uri } : prev);
      setUploading(true);

      const token = await AsyncStorage.getItem("token");
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;

      const uploadRes = await fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: base64Image }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        Alert.alert("Upload failed", uploadData.message || "Could not upload image");
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
        return;
      }

      const cloudinaryUrl = uploadData.url;

      const saveRes = await fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profilePic: cloudinaryUrl }),
      });

      if (!saveRes.ok) { Alert.alert("Error", "Photo uploaded but failed to save."); return; }

      const updatedUser = { ...user!, profilePic: cloudinaryUrl };
      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      Alert.alert("Done", "Profile picture updated!");
    } catch (e) {
      console.log("handleChangePhoto error:", e);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } catch (e) { console.log("Logout API failed (ignored)", e); }
    finally {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      router.replace("/login");
    }
  };

  const accountSettings: SettingItem[] = [
    { icon: "person-outline", iconColor: "#667EEA", bgColor: "#EEF2FF", label: "Edit Profile", onPress: () => router.push("/(tabs)/edit-profile") },
    { icon: "notifications-outline", iconColor: "#F59E0B", bgColor: "#FEF3C7", label: "Notifications", onPress: () => {} },
    { icon: "shield-checkmark-outline", iconColor: "#10B981", bgColor: "#D1FAE5", label: "Privacy & Safety", onPress: () => {} },
    { icon: "lock-closed-outline", iconColor: "#8B5CF6", bgColor: "#F3E8FF", label: "Security", onPress: () => {} },
  ];

  const preferencesSettings: SettingItem[] = [
    { icon: "moon-outline", iconColor: "#6366F1", bgColor: "#EEF2FF", label: "Appearance", value: "Light", onPress: () => {} },
    { icon: "globe-outline", iconColor: "#0EA5E9", bgColor: "#E0F2FE", label: "Language", value: "English", onPress: () => {} },
    { icon: "volume-high-outline", iconColor: "#EC4899", bgColor: "#FCE7F3", label: "Sound & Vibration", onPress: () => {} },
  ];

  const supportSettings: SettingItem[] = [
    { icon: "help-circle-outline", iconColor: "#F59E0B", bgColor: "#FEF3C7", label: "Help & Support", onPress: () => {} },
    { icon: "chatbox-ellipses-outline", iconColor: "#10B981", bgColor: "#D1FAE5", label: "Give Feedback", onPress: () => {} },
    { icon: "information-circle-outline", iconColor: "#6B7280", bgColor: "#F3F4F6", label: "About UniTalk", value: "v1.0.0", onPress: () => router.push("/(tabs)/about") },
  ];

  const renderSettingRow = (item: SettingItem, index: number, isLast: boolean) => (
    <View key={item.label}>
      <TouchableOpacity style={styles.settingRow} onPress={item.onPress} activeOpacity={0.6}>
        <View style={[styles.settingIcon, { backgroundColor: item.bgColor }]}>
          <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
        </View>
        <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>{item.label}</Text>
        <View style={styles.settingRight}>
          {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
          <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.rowDivider} />}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient colors={["#F8F9FA", "#E9ECEF"]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingSpinner}>
          <Ionicons name="person-circle-outline" size={48} color="#667EEA" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#F8F9FA", "#E9ECEF", "#F1F3F5"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        // ✅ paddingBottom clears the floating BottomNav
        contentContainerStyle={[styles.scrollContent, { paddingBottom: NAV_BOTTOM_PADDING }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#667EEA", "#764BA2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            >
              <View style={[styles.orb, { top: -20, right: -20, width: 100, height: 100 }]} />
              <View style={[styles.orb, { bottom: -30, left: -20, width: 80, height: 80 }]} />

              <View style={styles.profileContent}>
                <View style={styles.avatarWrapper}>
                  {user.profilePic ? (
                    <Image source={{ uri: user.profilePic }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.editAvatarButton}
                    onPress={handleChangePhoto}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  <View style={styles.profileTagRow}>
                    <View style={styles.profileTag}>
                      <Ionicons name="person" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.profileTagText}>{user.gender}</Text>
                    </View>
                    <View style={styles.profileTag}>
                      <Ionicons name="school" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.profileTagText}>Student</Text>
                    </View>
                  </View>
                </View>
              </View>

              {uploading && (
                <View style={styles.uploadingBanner}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              )}
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.sectionCard}>
              {accountSettings.map((item, i) => renderSettingRow(item, i, i === accountSettings.length - 1))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.sectionCard}>
              {preferencesSettings.map((item, i) => renderSettingRow(item, i, i === preferencesSettings.length - 1))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.sectionCard}>
              {supportSettings.map((item, i) => renderSettingRow(item, i, i === supportSettings.length - 1))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <View style={styles.logoutContent}>
                <View style={[styles.settingIcon, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.logoutText}>Logout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>UniTalk v1.0.0 • Made with ❤️</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingSpinner: { alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: "#6B7280", fontWeight: "500" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  scrollContent: { paddingHorizontal: 20 },

  profileCard: {
    borderRadius: 24, overflow: "hidden", marginBottom: 28,
    shadowColor: "#667EEA", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  profileGradient: { padding: 24, position: "relative" },
  orb: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  profileContent: { flexDirection: "row", alignItems: "center", gap: 18, zIndex: 1 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)" },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitial: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  editAvatarButton: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFFFFF",
  },
  uploadingBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, alignSelf: "flex-start",
  },
  uploadingText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  profileTagRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  profileTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  profileTagText: { fontSize: 11, color: "rgba(255,255,255,0.95)", fontWeight: "600" },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1F2937" },
  settingLabelDanger: { color: "#EF4444" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  rowDivider: { height: 1, backgroundColor: "#F9FAFB", marginLeft: 72 },

  logoutButton: {
    backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: "#FECACA",
    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  logoutContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#EF4444" },

  versionText: { textAlign: "center", fontSize: 13, color: "#CBD5E0", fontWeight: "500", marginBottom: 8 },
});