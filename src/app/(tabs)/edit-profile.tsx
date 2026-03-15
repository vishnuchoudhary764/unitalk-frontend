import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "../../config/api";

export default function EditProfileScreen() {
  const router = useRouter();

  const [originalName, setOriginalName] = useState("");
  const [name, setName] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [localImageUri, setLocalImageUri] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setOriginalName(data.user.name ?? "");
          setName(data.user.name ?? "");
          setProfilePicUrl(data.user.profilePic ?? "");
          setLocalImageUri(data.user.profilePic ?? "");
        }
      } catch (e) {
        console.log("fetchProfile error:", e);
      } finally {
        setPageLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
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
      setLocalImageUri(asset.uri); 

      setUploading(true);
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      const token = await AsyncStorage.getItem("token");

      const uploadRes = await fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        Alert.alert("Upload failed", uploadData.message || "Could not upload image");
        setLocalImageUri(profilePicUrl); 
        return;
      }

      const newUrl = uploadData.url;
      setProfilePicUrl(newUrl);

      
      const saveRes = await fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePic: newUrl }),
      });

      if (saveRes.ok) {
        Alert.alert("Done", "Profile picture updated!");
      } else {
        Alert.alert("Error", "Picture uploaded but failed to save.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick or upload image");
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Invalid", "Name must be at least 2 characters.");
      return;
    }
    if (name.trim() === originalName) {
      Alert.alert("No changes", "Name is the same as before.");
      return;
    }

    try {
      setSavingName(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to update name");
        return;
      }

      setOriginalName(name.trim());
      Alert.alert(" Done", "Name updated successfully!");
    } catch (e) {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Required", "Enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Too short", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to update password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Done", "Password updated successfully!");
    } catch (e) {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setSavingPassword(false);
    }
  };

  if (pageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#667EEA" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8F9FA", "#E9ECEF", "#F1F3F5"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="image-outline" size={18} color="#667EEA" />
            </View>
            <Text style={styles.cardTitle}>Profile Picture</Text>
          </View>

          <View style={styles.picRow}>
            <View style={styles.avatarWrapper}>
              {localImageUri ? (
                <Image source={{ uri: localImageUri }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={["#667EEA", "#764BA2"]}
                  style={styles.avatarPlaceholder}
                >
                  <Ionicons name="person" size={40} color="#FFFFFF" />
                </LinearGradient>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.picInfo}>
              <Text style={styles.picHint}>
                {uploading
                  ? "Uploading & saving..."
                  : "Tap the button to pick a new photo.\nIt uploads and saves automatically."}
              </Text>
              <TouchableOpacity
                style={[styles.picButton, uploading && styles.picButtonDisabled]}
                onPress={pickImage}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#667EEA" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={18} color="#667EEA" />
                    <Text style={styles.picButtonText}>Change Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="person-outline" size={18} color="#667EEA" />
            </View>
            <Text style={styles.cardTitle}>Display Name</Text>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                maxLength={40}
              />
              {name !== originalName && name.trim().length >= 2 && (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.sectionSaveButton,
              (savingName || name.trim() === originalName) && styles.sectionSaveButtonDisabled,
            ]}
            onPress={saveName}
            disabled={savingName || name.trim() === originalName}
            activeOpacity={0.8}
          >
            {savingName ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.sectionSaveText}>Update Name</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#667EEA" />
            </View>
            <Text style={styles.cardTitle}>Change Password</Text>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent((p) => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew((p) => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={[
              styles.inputRow,
              confirmPassword.length > 0 && newPassword !== confirmPassword && styles.inputRowError,
            ]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.sectionSaveButton,
              (savingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword)
                && styles.sectionSaveButtonDisabled,
            ]}
            onPress={savePassword}
            disabled={
              savingPassword ||
              !currentPassword ||
              newPassword.length < 6 ||
              newPassword !== confirmPassword
            }
            activeOpacity={0.8}
          >
            {savingPassword ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
                <Text style={styles.sectionSaveText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", letterSpacing: -0.3 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  cardIconWrapper: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },

  picRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatarWrapper: { position: "relative", width: 90, height: 90 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#F1F5F9" },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center" },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center",
  },
  picInfo: { flex: 1, gap: 12 },
  picHint: { fontSize: 13, color: "#6B7280", lineHeight: 19 },
  picButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#EEF2FF", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, alignSelf: "flex-start",
  },
  picButtonDisabled: { opacity: 0.5 },
  picButtonText: { fontSize: 14, fontWeight: "600", color: "#667EEA" },

  fieldWrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, marginLeft: 2 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F8FAFC", borderRadius: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
  },
  inputRowError: { borderColor: "#EF4444" },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#1F2937" },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4, marginLeft: 2 },

  sectionSaveButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#667EEA",
    paddingVertical: 13, borderRadius: 14, marginTop: 4,
  },
  sectionSaveButtonDisabled: { backgroundColor: "#CBD5E1" },
  sectionSaveText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});