import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Animated,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { io, Socket } from "socket.io-client";
import BottomNav from "@/src/components/BottomNav";
import BASE_URL from "@/src/config/api";

const GRADIENT_PAIRS: [string, string][] = [
  ["#667EEA", "#764BA2"],
  ["#F093FB", "#F5576C"],
  ["#4FACFE", "#00F2FE"],
  ["#43E97B", "#38F9D7"],
  ["#FA709A", "#FEE140"],
  ["#A18CD1", "#FBC2EB"],
  ["#FEE140", "#FA709A"],
];

export default function FriendsScreen() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "online">("all");
  const [search, setSearch] = useState("");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<Record<string, { lastMessage: string; unreadCount: number; lastAt: string }>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();

    fetchFriends();
    fetchPreviews();
    connectSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchPreviews = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/private-chat/previews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPreviews(data.previews);
    } catch (err) {
      console.log("fetchPreviews error:", err);
    }
  };

  const connectSocket = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const socket = io(BASE_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("user-online", ({ userId }: { userId: string }) => {
      setOnlineIds((prev) => { const n = new Set(prev); n.add(userId); return n; });
    });

    socket.on("user-offline", ({ userId }: { userId: string }) => {
      setOnlineIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    });

    socket.on("new-private-message", (msg: any) => {
      const friendId = msg.sender; 
      setPreviews((prev) => ({
        ...prev,
        [friendId]: {
          lastMessage: msg.type === "image" ? "📷 Photo" : msg.message || "",
          unreadCount: (prev[friendId]?.unreadCount ?? 0) + 1,
          lastAt: msg.createdAt,
        },
      }));
    });
  };

  useEffect(() => {
    let result = [...friends];
    if (activeFilter === "online") result = result.filter((f) => onlineIds.has(f._id));
    if (search.trim())
      result = result.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      );
    setFiltered(result);
  }, [search, friends, activeFilter, onlineIds]);

  const mergedFiltered = filtered.map((f) => ({
    ...f,
    isOnline: onlineIds.has(f._id),
  }));

  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/requests/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const friendsList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.friends)
        ? data.friends
        : [];

      setFriends(friendsList);
      setFiltered(friendsList);

      const initial = new Set<string>(
        friendsList.filter((f: any) => f.isOnline).map((f: any) => f._id)
      );
      setOnlineIds(initial);
    } catch (err) {
      console.log("fetchFriends error:", err);
      setFriends([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  const getGradient = (id: string): [string, string] =>
    GRADIENT_PAIRS[id.charCodeAt(0) % GRADIENT_PAIRS.length];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const preview = previews[item._id];
    const lastMsg = preview?.lastMessage || "";
    const unread = preview?.unreadCount ?? 0;

    return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 30],
              outputRange: [0, 30 + index * 6],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/private-chat",
            params: { friendId: item._id },
          })
        }
      >
        <View style={styles.avatarContainer}>
          {item.profilePic ? (
            <Image
              source={{ uri: item.profilePic }}
              style={styles.avatarImage}
            />
          ) : (
            <LinearGradient
              colors={getGradient(item._id)}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </LinearGradient>
          )}
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.info}>
          <Text style={styles.friendName}>{item.name}</Text>
          <View style={styles.previewRow}>
            {item.isOnline ? (
              <View style={styles.activeRow}>
                <Text style={styles.onlineLabel}>Active now</Text>
              </View>
            ) : (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {lastMsg || "Tap to start chatting"}
              </Text>
            )}
          </View>
        </View>

        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8F9FA", "#E9ECEF", "#F1F3F5"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Friends</Text>
          {friends.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{friends.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={fetchFriends}>
          <Ionicons name="refresh-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={mergedFiltered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <Animated.View
              style={[
                styles.emptyState,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["#EEF2FF", "#F3E8FF"]}
                style={styles.emptyIconCircle}
              >
                <Ionicons
                  name={search ? "search-outline" : "people-outline"}
                  size={52}
                  color="#667EEA"
                />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {search ? "No Results Found" : "No Friends Yet"}
              </Text>
              <Text style={styles.emptyDescription}>
                {search
                  ? `No friends matching "${search}"`
                  : "Start anonymous chats to make new friends on campus."}
              </Text>
              {!search && (
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
              )}
            </Animated.View>
          ) : null
        }
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

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

  addButton: {
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

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
  },

  avatarContainer: {
    position: "relative",
  },

  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
  },

  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarEmoji: {
    fontSize: 28,
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },

  info: {
    flex: 1,
    gap: 5,
  },

  friendName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.2,
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },

  onlineLabel: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },

  lastMessage: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  unreadBadge: {
    backgroundColor: "#667EEA",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
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
    marginBottom: 10,
    letterSpacing: -0.5,
  },

  emptyDescription: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
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