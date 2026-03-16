
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRequestCount } from "@/src/context/RequestCountContext";
import BASE_URL from "../../config/api";

const { width, height } = Dimensions.get("window");

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

const getGradient = (id: string): [string, string] =>
  GRADIENT_PAIRS[id.charCodeAt(0) % GRADIENT_PAIRS.length];

interface User {
  name: string;
  email: string;
  gender: string;
  profilePic?: string;
}
interface Friend {
  _id: string;
  id?: string;
  name: string;
  profilePic?: string;
  isOnline?: boolean;
  lastSeen?: string;
}
interface Request {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  profilePic?: string;
  mutualFriends?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { setRequestCount } = useRequestCount();
  const socketRef = useRef<Socket | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const popupAnim = useRef(new Animated.Value(0)).current;
  const popupSlideAnim = useRef(new Animated.Value(-14)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.93)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const mergedFriends = friends.map((f) => ({
    ...f,
    isOnline: onlineIds.has(f._id ?? f.id ?? ""),
  }));
  const onlineCount = mergedFriends.filter((f) => f.isOnline).length;

  const loadUser = async () => {
    try {
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

  const handleLogout = async () => {
    closeProfile();
    setTimeout(async () => {
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
    }, 200);
  };

  const openProfile = () => {
    setProfileVisible(true);
    popupAnim.setValue(0);
    popupSlideAnim.setValue(-14);
    popupScaleAnim.setValue(0.93);
    Animated.parallel([
      Animated.timing(popupAnim, { toValue: 1, duration: 230, useNativeDriver: true }),
      Animated.spring(popupSlideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      Animated.spring(popupScaleAnim, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const closeProfile = () => {
    Animated.parallel([
      Animated.timing(popupAnim, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(popupSlideAnim, { toValue: -14, duration: 170, useNativeDriver: true }),
      Animated.timing(popupScaleAnim, { toValue: 0.93, duration: 170, useNativeDriver: true }),
    ]).start(() => setProfileVisible(false));
  };

  const fetchFriendRequests = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests ?? []);
        setRequestCount((data.requests ?? []).length); 
      }
    } catch (e) { console.log("fetchFriendRequests error:", e); }
  }, []);

  const fetchFriends = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/requests/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Friend[] = Array.isArray(data) ? data : Array.isArray(data.friends) ? data.friends : [];
      setFriends(list);
      setOnlineIds(new Set<string>(list.filter((f) => f.isOnline).map((f) => f._id ?? f.id ?? "")));
    } catch (e) { console.log("fetchFriends error:", e); setFriends([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFriendRequests();
    fetchFriends();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.spring(logoScaleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
          Animated.timing(logoOpacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
    loadUser();

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) { router.replace("/(auth)/login"); return; }
        const socket = io(BASE_URL, { auth: { token }, transports: ["websocket"], forceNew: true });
        socketRef.current = socket;
        socket.on("waiting", () => setIsSearching(true));
        socket.on("match-found", () => { setIsSearching(false); stopPulse(); router.push("/(tabs)/chat"); });
        socket.on("friend-request-accepted", ({ friendId }) => {
          setIsSearching(false); stopPulse(); socket.disconnect();
          router.replace({ pathname: "/(tabs)/private-chat", params: { friendId } });
        });
        socket.on("search-cancelled", () => setIsSearching(false));
        socket.on("error", (err) => { setIsSearching(false); Alert.alert("Error", err?.message || "Something went wrong"); });
        socket.on("connect_error", () => Alert.alert("Error", "Failed to connect to server"));
        socket.on("user-online", ({ userId }: { userId: string }) =>
          setOnlineIds((prev) => { const n = new Set(prev); n.add(userId); return n; }));
        socket.on("user-offline", ({ userId }: { userId: string }) =>
          setOnlineIds((prev) => { const n = new Set(prev); n.delete(userId); return n; }));
      } catch (error) { console.log("Init socket error:", error); }
    };
    initSocket();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, []);

  const startPulse = () => {
    pulseAnim.setValue(1);
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    pulseRef.current = null;
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const handleStartChat = () => {
    if (!socketRef.current?.connected) { Alert.alert("Error", "Not connected to server"); return; }
    if (isSearching) return;
    setIsSearching(true);
    startPulse();
    socketRef.current.emit("find-match");
  };

  const handleCancelSearch = () => {
    socketRef.current?.emit("cancel-search");
    setIsSearching(false);
    stopPulse();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#F0EEFF", "#EAE6FF", "#F5F3FF"]} style={styles.gradientBackground} />

      <View style={styles.header}>
        <Animated.View style={[styles.brandContainer, { opacity: logoOpacityAnim, transform: [{ scale: logoScaleAnim }] }]}>
          <View style={styles.logoWrapper}>
            <Image source={require("../../assets/uniTalk.png")} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.headerTitle}>Anonymous</Text>
            <Text style={styles.headerSubtitle}>Connect & Chat</Text>
          </View>
        </Animated.View>

        <View style={styles.headerRight}>
          {onlineCount > 0 && (
            <View style={styles.onlinePill}>
              <View style={styles.onlinePillDot} />
              <Text style={styles.onlinePillText}>{onlineCount} online</Text>
            </View>
          )}
          <TouchableOpacity style={styles.profileButton} onPress={openProfile}>
            <View style={styles.profileIconWrapper}>
               <Ionicons name="person-circle-outline" size={40} color="#667EEA" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.heroSection}>
            <LinearGradient colors={["#a790e2", "#4835d3"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
              <View style={styles.heroDecorations}>
                <View style={[styles.floatingCircle, { top: 20, left: 20, width: 60, height: 60 }]} />
                <View style={[styles.floatingCircle, { top: 40, right: 30, width: 80, height: 80 }]} />
                <View style={[styles.floatingCircle, { bottom: 30, left: 50, width: 50, height: 50 }]} />
              </View>

              <View style={styles.heroContent}>
                <Text style={styles.heroDescription}>
                  Connect with verified college students{"\n"}in a safe, anonymous space
                </Text>

                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={[styles.startButton, isSearching && styles.startButtonSearching]}
                    onPress={isSearching ? handleCancelSearch : handleStartChat}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={isSearching ? "close-circle-outline" : "chatbubble-ellipses-outline"}
                      size={20}
                      color={isSearching ? "#a78bfa" : "#667EEA"}
                    />
                    <Text style={[styles.startButtonText, isSearching && styles.startButtonTextSearching]}>
                      {isSearching ? "Cancel Search" : "Find Chat Partner"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                {isSearching && (
                  <Text style={styles.searchingLabel}>Looking for someone to connect…</Text>
                )}
              </View>
            </LinearGradient>
          </View>

          {requests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  <View style={styles.countBadge}><Text style={styles.countBadgeText}>{requests.length}</Text></View>
                </View>
                <TouchableOpacity onPress={() => router.push("/(tabs)/requests")}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestsScroll}>
                {requests.map((request: any) => {
                  const rid = request._id ?? request.id ?? "0";
                  return (
                    <TouchableOpacity key={rid} onPress={() => router.push("/(tabs)/requests")}>
                      <View style={styles.requestCard}>
                        <View style={styles.requestCardContent}>
                          <View style={styles.requestAvatarWrapper}>
                            {request.profilePic ? (
                              <Image source={{ uri: request.profilePic }} style={styles.requestAvatarImage} />
                            ) : (
                              <LinearGradient colors={["#667EEA", "#764BA2"]} style={styles.requestAvatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <Ionicons name="person" size={24} color="#FFFFFF" />
                              </LinearGradient>
                            )}
                          </View>
                          <View style={styles.requestInfo}>
                            <Text style={styles.requestName} numberOfLines={1}>{request.name}</Text>
                            <Text style={styles.mutualFriends}>{request.mutualFriends ? `${request.mutualFriends} mutual friends` : "New connection"}</Text>
                          </View>
                          <View style={styles.requestActions}>
                            <TouchableOpacity style={styles.acceptButton} onPress={() => router.push("/(tabs)/requests")}><Text style={styles.acceptButtonText}>Accept</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.declineButton} onPress={() => router.push("/(tabs)/requests")}><Text style={styles.declineButtonText}>Decline</Text></TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
               
                <Text style={styles.sectionTitle}>Your Friends</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/friends")}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>
            <View style={styles.friendsList}>
              {mergedFriends.map((friend) => {
                const fid = friend._id ?? friend.id ?? "0";
                return (
                  <TouchableOpacity key={fid} onPress={() => router.push({ pathname: "/(tabs)/private-chat", params: { friendId: fid } } as any)} style={styles.friendCard} activeOpacity={0.7}>
                    <View style={styles.friendCardContent}>
                      <View style={styles.friendLeft}>
                        <View style={styles.friendAvatarWrapper}>
                          {friend.profilePic ? (
                            <Image source={{ uri: friend.profilePic }} style={styles.friendAvatarImage} />
                          ) : (
                            <LinearGradient colors={getGradient(fid)} style={styles.friendAvatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                              <Ionicons name="person" size={24} color="#FFFFFF" />
                            </LinearGradient>
                          )}
                          {friend.isOnline && <View style={styles.onlineIndicator} />}
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <Text style={[styles.friendStatus, friend.isOnline && styles.friendStatusOnline]}>
                            {friend.isOnline ? "Active now" : friend.lastSeen ?? "Offline"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {mergedFriends.length === 0 && !loading && (
                <Text style={styles.emptyText}>No friends yet. Start chatting!</Text>
              )}
            </View>
          </View>

        </Animated.View>
      </ScrollView>

      {profileVisible && (
        <>
          <TouchableWithoutFeedback onPress={closeProfile}>
            <Animated.View style={[styles.popupBackdrop, { opacity: popupAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.popupWrapper,
              { opacity: popupAnim, transform: [{ translateY: popupSlideAnim }, { scale: popupScaleAnim }] },
            ]}
          >
            <BlurView intensity={80} tint="light" style={styles.popupBlur}>
              <View style={styles.popupTint} />
              <View style={styles.popupShimmer} />

              <View style={styles.popupHeader}>
                <View style={styles.popupAvatarRing}>
                  {user?.profilePic ? (
                    <Image source={{ uri: user.profilePic }} style={styles.popupAvatarImage} />
                  ) : (
                    <LinearGradient colors={["#a78bfa", "#7c3aed"]} style={styles.popupAvatarFallback}>
                      <Text style={styles.popupAvatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? "?"}</Text>
                    </LinearGradient>
                  )}
                </View>

                <View style={styles.popupUserInfo}>
                  <Text style={styles.popupName} numberOfLines={1}>{user?.name ?? "Loading..."}</Text>
                  <Text style={styles.popupEmail} numberOfLines={1}>{user?.email ?? ""}</Text>
                </View>

                <TouchableOpacity style={styles.popupCloseBtn} onPress={closeProfile}>
                  <Ionicons name="close" size={14} color="rgba(109,40,217,0.8)" />
                </TouchableOpacity>
              </View>

              <View style={styles.popupTagsRow}>
                {user?.gender ? (
                  <View style={styles.popupTag}>
                    <Ionicons name="person-outline" size={11} color="#7c3aed" />
                    <Text style={styles.popupTagText}>{user.gender}</Text>
                  </View>
                ) : null}
                <View style={styles.popupTag}>
                  <Ionicons name="school-outline" size={11} color="#7c3aed" />
                  <Text style={styles.popupTagText}>Student</Text>
                </View>
              </View>

              <View style={styles.popupDivider} />

              <View style={styles.popupActions}>
                <TouchableOpacity
                  style={styles.popupActionBtn}
                  onPress={() => { closeProfile(); setTimeout(() => router.push("/(tabs)/edit-profile"), 200); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={14} color="#7c3aed" />
                  <Text style={styles.popupActionText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.popupActionBtn, styles.popupLogoutBtn]} onPress={handleLogout} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={14} color="#dc2626" />
                  <Text style={[styles.popupActionText, styles.popupLogoutText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F3FF" },
  gradientBackground: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingTop:20, paddingBottom: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  brandContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoWrapper: { width: 75, height: 75, borderRadius: 14, backgroundColor: "#fffbfb", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  logoImage: { width: 70, height: 70 },
  brandText: { justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#a287c1", letterSpacing: -0.5, lineHeight: 24 },
  headerSubtitle: { fontSize: 11, color: "#242325", fontWeight: "600", marginTop: 1, letterSpacing: 0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  onlinePillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  onlinePillText: { fontSize: 12, fontWeight: "700", color: "#065F46" },
  profileButton: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  profileIconWrapper: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  headerDivider: { height: 1, backgroundColor: "rgba(139, 92, 246, 0.12)" },

  content: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: NAV_BOTTOM_PADDING },

  heroSection: { marginHorizontal: 16, marginTop: 14, marginBottom: 24, borderRadius: 24, overflow: "hidden", elevation: 10, shadowColor: "#4835d3", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
  heroGradient: { padding: 28, position: "relative", minHeight: 220 },
  heroDecorations: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  floatingCircle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  heroContent: { alignItems: "center", zIndex: 1, minHeight: 170, justifyContent: "center" },
  heroDescription: { fontSize: 15, color: "rgba(255,255,255,0.93)", textAlign: "center", lineHeight: 23, marginBottom: 28, fontWeight: "500" },

  startButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", paddingHorizontal: 30, paddingVertical: 15,
    borderRadius: 16, gap: 8, elevation: 6,
    shadowColor: "#4835d3", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  startButtonSearching: { backgroundColor: "rgba(255,255,255,0.88)" },
  startButtonText: { fontSize: 15, fontWeight: "700", color: "#667EEA" },
  startButtonTextSearching: { color: "#7c3aed" },
  searchingLabel: { marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500", letterSpacing: 0.2 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, },
  sectionTitle: {fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1, },
  countBadge: { backgroundColor: "#667EEA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  seeAllText: { fontSize: 12, color: "#667EEA", fontWeight: "600" ,textTransform: "uppercase",},

  requestsScroll: { paddingHorizontal: 20, gap: 16 },
  requestCard: { width: 185, backgroundColor: "#FFFFFF", borderRadius: 20, shadowColor: "#667EEA", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  requestCardContent: { padding: 20 },
  requestAvatarWrapper: { width: 72, height: 72, alignSelf: "center", marginBottom: 16, borderRadius: 36, overflow: "hidden" },
  requestAvatarImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#F1F5F9" },
  requestAvatarGradient: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  requestInfo: { alignItems: "center", marginBottom: 16 },
  requestName: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  mutualFriends: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  requestActions: { flexDirection: "row", gap: 10 },
  acceptButton: { flex: 1, backgroundColor: "#667EEA", paddingVertical: 12, borderRadius: 14, alignItems: "center", elevation: 4 },
  acceptButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  declineButton: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  declineButtonText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },

  friendsList: { paddingHorizontal: 16, gap: 10 },
  friendCard: { backgroundColor: "#FFFFFF", borderRadius: 16, shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  friendCardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  friendLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  friendAvatarWrapper: { width: 52, height: 52, position: "relative" },
  friendAvatarImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F1F5F9" },
  friendAvatarGradient: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  onlineIndicator: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#10B981", borderWidth: 2, borderColor: "#FFFFFF" },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 3 },
  friendStatus: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  friendStatusOnline: { color: "#10B981", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, paddingVertical: 20 },

  popupBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 10, 50, 0.18)" },
  popupWrapper: { position: "absolute", top: 88, right: 14, width: 275, borderRadius: 20, overflow: "hidden" },
  popupBlur: { borderRadius: 20, overflow: "hidden" },
  popupTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "white" },
  popupShimmer: { height: 1, marginHorizontal: 20, backgroundColor: "rgba(192, 168, 255, 0.6)" },
  popupHeader: { flexDirection: "row", alignItems: "center", gap: 11, padding: 16, paddingBottom: 11 },
  popupAvatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: "rgba(124, 58, 237, 0.4)", overflow: "hidden", backgroundColor: "rgba(196, 181, 253, 0.25)", justifyContent: "center", alignItems: "center" },
  popupAvatarImage: { width: 56, height: 56, borderRadius: 28 },
  popupAvatarFallback: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  popupAvatarInitial: { fontSize: 22, fontWeight: "700", color: "#fff" },
  popupUserInfo: { flex: 1 },
  popupName: { fontSize: 15, fontWeight: "700", color: "#3b0764", letterSpacing: -0.2 },
  popupEmail: { fontSize: 11, color: "rgba(109,40,217,0.6)", marginTop: 2 },
  popupCloseBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.18)", borderWidth: 1, borderColor: "rgba(167,139,250,0.3)", justifyContent: "center", alignItems: "center" },
  popupTagsRow: { flexDirection: "row", gap: 7, paddingHorizontal: 16, paddingBottom: 13, flexWrap: "wrap" },
  popupTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(139,92,246,0.1)", borderWidth: 1, borderColor: "rgba(139,92,246,0.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  popupTagText: { fontSize: 11, color: "#6d28d9", fontWeight: "600" },
  popupDivider: { height: 1, marginHorizontal: 16, backgroundColor: "rgba(139,92,246,0.12)" },
  popupActions: { flexDirection: "row", gap: 9, padding: 13 },
  popupActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(139,92,246,0.09)", borderWidth: 1, borderColor: "rgba(139,92,246,0.2)", borderRadius: 11, paddingVertical: 10 },
  popupLogoutBtn: { backgroundColor: "rgba(220,38,38,0.07)", borderColor: "rgba(220,38,38,0.18)" },
  popupActionText: { fontSize: 12, color: "#6d28d9", fontWeight: "600" },
  popupLogoutText: { color: "#dc2626" },
});