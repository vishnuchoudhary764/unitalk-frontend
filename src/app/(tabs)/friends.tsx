
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Animated,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { io, Socket } from "socket.io-client";
import BASE_URL from "@/src/config/api";

const NAV_BOTTOM_PADDING = Platform.OS === "ios" ? 100 : 88;

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
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, []);

  const fetchPreviews = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/private-chat/previews`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPreviews(data.previews);
    } catch (err) { console.log("fetchPreviews error:", err); }
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
    if (search.trim()) result = result.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [search, friends, onlineIds]);

  const mergedFiltered = filtered.map((f) => ({ ...f, isOnline: onlineIds.has(f._id) }));
  const onlineCount = mergedFiltered.filter((f) => f.isOnline).length;

  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/requests/friends`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const friendsList: any[] = Array.isArray(data) ? data : Array.isArray(data.friends) ? data.friends : [];
      setFriends(friendsList);
      setFiltered(friendsList);
      setOnlineIds(new Set<string>(friendsList.filter((f: any) => f.isOnline).map((f: any) => f._id)));
    } catch (err) {
      console.log("fetchFriends error:", err);
      setFriends([]); setFiltered([]);
    } finally { setLoading(false); }
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
          transform: [{
            translateY: slideAnim.interpolate({ inputRange: [0, 30], outputRange: [0, 30 + index * 6] }),
          }],
        }}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: "/private-chat", params: { friendId: item._id } })}
        >
          <View style={styles.avatarContainer}>
            {item.profilePic ? (
              <Image source={{ uri: item.profilePic }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={getGradient(item._id)} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarInitial}>{item.name?.[0]?.toUpperCase() ?? "?"}</Text>
              </LinearGradient>
            )}
            {item.isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.info}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={[styles.lastMessage, item.isOnline && styles.onlineLabel]} numberOfLines={1}>
              {item.isOnline ? "● Active now" : lastMsg || "Tap to start chatting"}
            </Text>
          </View>

          <View style={styles.cardRight}>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color="#C4B5FD" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#f9f8fa", "#f9f9fc", "#f4f3f7"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#151515" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends…"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={mergedFiltered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.listContent, { paddingBottom: NAV_BOTTOM_PADDING }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={renderItem}
        ListHeaderComponent={
          mergedFiltered.length > 0 ? (
            <Text style={styles.listLabel}>
              {search ? `Results for "${search}"` : "All Friends"}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View style={[styles.emptyState, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <LinearGradient colors={["#EDE9FE", "#EEF2FF"]} style={styles.emptyIconCircle}>
                <Ionicons name={search ? "search-outline" : "people-outline"} size={48} color="#6D28D9" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{search ? "No Results" : "No Friends Yet"}</Text>
              <Text style={styles.emptyDescription}>
                {search
                  ? `No friends matching "${search}"`
                  : "Start anonymous chats to make friends on campus."}
              </Text>
              {!search && (
                <TouchableOpacity
                               style={styles.emptyBtn}
                               onPress={() => router.push("/home")}
                               activeOpacity={0.8}
                             >
                               <Text style={styles.emptyBtnText}>Find Someone</Text>
                               <Ionicons name="arrow-forward" size={14} color="#6366F1" />
                             </TouchableOpacity>
              )}
            </Animated.View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F3FF" },

  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 8 : 64,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
    padding: 0,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    flexGrow: 1,
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
  listLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#6D28D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },

  avatarContainer: { position: "relative" },

  avatarImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F1F5F9" },

  avatarGradient: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },

  avatarInitial: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },

  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: "#10B981", borderWidth: 2, borderColor: "#FFFFFF",
  },

  info: { flex: 1, gap: 4 },

  friendName: { fontSize: 15, fontWeight: "700", color: "#1F2937", letterSpacing: -0.2 },

  lastMessage: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },

  onlineLabel: { color: "#10B981", fontWeight: "600" },

  cardRight: { alignItems: "center", gap: 6 },

  unreadBadge: {
    backgroundColor: "#6D28D9", minWidth: 20, height: 20,
    borderRadius: 10, justifyContent: "center", alignItems: "center", paddingHorizontal: 5,
  },

  unreadText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },

  // ── EMPTY ──
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },

  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },

  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937", marginBottom: 8, letterSpacing: -0.5 },

  emptyDescription: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21, marginBottom: 28 },

});