import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Animated,
  Platform,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BASE_URL from "../../config/api";

const NAV_BOTTOM_PADDING = Platform.OS === "ios" ? 100 : 88;

const AVATAR_GRADIENTS: [string, string][] = [
  ["#6366F1", "#8B5CF6"],
  ["#EC4899", "#F43F5E"],
  ["#0EA5E9", "#6366F1"],
  ["#10B981", "#0EA5E9"],
  ["#F59E0B", "#EF4444"],
];

const getAvatarGradient = (name: string): [string, string] =>
  AVATAR_GRADIENTS[(name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];

export default function Requests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (userId: string) => {
    setProcessingId(userId);
    const token = await AsyncStorage.getItem("token");
    await fetch(`${BASE_URL}/api/requests/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ senderId: userId }),
    });
    setRequests((prev) => prev.filter((r) => r._id !== userId));
    setProcessingId(null);
  };

  const rejectRequest = async (userId: string) => {
    setProcessingId(userId);
    const token = await AsyncStorage.getItem("token");
    await fetch(`${BASE_URL}/api/requests/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ senderId: userId }),
    });
    setRequests((prev) => prev.filter((r) => r._id !== userId));
    setProcessingId(null);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isProcessing = processingId === item._id;
    const grad = getAvatarGradient(item.name);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 16],
              outputRange: [0, 16 + index * 5],
            }),
          }],
        }}
      >
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {item.profilePic ? (
              <Image source={{ uri: item.profilePic }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={grad} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarInitial}>{item.name?.[0]?.toUpperCase() ?? "?"}</Text>
              </LinearGradient>
            )}
            <View style={styles.newDot} />
          </View>

          <View style={styles.info}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userSub}>Wants to connect with you</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.declineBtn, isProcessing && styles.btnDisabled]}
              onPress={() => rejectRequest(item._id)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={15} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtnWrap, isProcessing && styles.btnDisabled]}
              onPress={() => acceptRequest(item._id)}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={15} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.separator} />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.listContent, { paddingBottom: NAV_BOTTOM_PADDING, paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListHeaderComponent={
          requests.length > 0 ? (
            <Text style={styles.sectionLabel}>
              PENDING · {requests.length}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="mail-open-outline" size={36} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptyDesc}>
                You're all caught up. Start chatting{"\n"}to meet new people.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/home")}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Find Someone</Text>
                <Ionicons name="arrow-forward" size={14} color="#6366F1" />
              </TouchableOpacity>
            </Animated.View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
   marginTop:20,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 76,
  },

  avatarWrapper: { position: "relative" },

  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
  },

  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  newDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  info: {
    flex: 1,
    gap: 2,
  },

  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: -0.2,
  },

  userSub: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  declineBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  acceptBtnWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  btnDisabled: { opacity: 0.4 },

  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.3,
  },

  emptyDesc: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
  },

  emptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
});