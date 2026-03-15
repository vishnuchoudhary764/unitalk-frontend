// app/requests.tsx
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import BottomNav from "@/src/components/BottomNav";
import BASE_URL from "../../config/api";


export default function Requests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ senderId: userId }),
    });
    setRequests((prev) => prev.filter((r) => r._id !== userId));
    setProcessingId(null);
  };

 

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isProcessing = processingId === item._id;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30 + index * 8],
              }),
            },
          ],
        }}
      >
        <View style={styles.card}>
          {/* Avatar + Info */}
          <View style={styles.cardTop}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={["#667EEA", "#764BA2"]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={24} color="#FFFFFF" />
                
              </LinearGradient>
              <View style={styles.newBadge}>
                <View style={styles.newBadgeDot} />
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userSubtitle}>sent you a friend request</Text>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Ionicons name="school-outline" size={12} color="#667EEA" />
                  <Text style={styles.tagText}>College Student</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
              onPress={() => rejectRequest(item._id)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#EF4444" />
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={() => acceptRequest(item._id)}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isProcessing ? ["#CBD5E0", "#CBD5E0"] : ["#667EEA", "#764BA2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptGradient}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={["#F8F9FA", "#E9ECEF", "#F1F3F5"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Friend Requests</Text>
          {requests.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{requests.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchRequests}>
          <Ionicons name="refresh-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      {!loading && requests.length > 0 && (
        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={styles.summaryBar}>
            <View style={styles.summaryIconWrapper}>
              <Ionicons name="people" size={20} color="#667EEA" />
            </View>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryCount}>{requests.length} </Text>
              {requests.length === 1 ? "person wants" : "people want"} to connect with you
            </Text>
          </View>
        </Animated.View>
      )}

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <Animated.View
              style={[styles.emptyState, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <LinearGradient
                colors={["#F3E8FF", "#EEF2FF"]}
                style={styles.emptyIconCircle}
              >
                <Ionicons name="people-outline" size={52} color="#667EEA" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyDescription}>
                No pending friend requests right now.{"\n"}
                Start an anonymous chat to meet new people.
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push("/home")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#667EEA", "#764BA2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyActionGradient}
                >
                  <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyActionText}>Start Chatting</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : null
        }
      />

      {/* Bottom Nav */}
      <BottomNav requestCount={requests.length} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.5,
  },

  headerBadge: {
    backgroundColor: "#667EEA",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },

  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Summary bar
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  summaryIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  summaryText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  summaryCount: {
    fontWeight: "700",
    color: "#667EEA",
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarEmoji: {
    fontSize: 30,
  },

  newBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  newBadgeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },

  userInfo: {
    flex: 1,
    gap: 4,
  },

  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.2,
  },

  userSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  tagText: {
    fontSize: 11,
    color: "#667EEA",
    fontWeight: "600",
  },

  profileArrow: {
    padding: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
  },

  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },

  rejectButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },

  acceptButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#667EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  acceptGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
  },

  acceptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },

  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  emptyDescription: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  emptyAction: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#667EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  emptyActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },

  emptyActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});