

// app/private-chat.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Animated,
  Keyboard,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "@/src/config/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BUBBLE_R = 18;

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
interface PrivateMessage {
  _id?: string;
  message?: string;
  image?: string;
  sender: string;
  receiver?: string;
  type?: "text" | "image" | "voice";
  createdAt?: Date | string;
  status?: "sent" | "delivered" | "read";
  replyTo?: PrivateMessage;
}

interface Friend {
  _id: string;
  name: string;
  profilePic?: string;
}

/* ─────────────────────────────────────────
   ANIMATED TYPING DOTS
───────────────────────────────────────── */
function TypingDots() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(560),
        ])
      );
    const a1 = anim(d1, 0);
    const a2 = anim(d2, 140);
    const a3 = anim(d3, 280);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={s.typingBubble}>
      {([d1, d2, d3] as Animated.Value[]).map((d, i) => (
        <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────
   FULL-SCREEN IMAGE VIEWER
───────────────────────────────────────── */
function ImageViewer({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[s.viewerBg, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <TouchableOpacity style={s.viewerCloseBtn} onPress={onClose} activeOpacity={0.85}>
          <BlurView intensity={55} tint="dark" style={s.viewerCloseBlur}>
            <Ionicons name="close" size={20} color="#FFF" />
          </BlurView>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale }] }}>
          <Image source={{ uri }} style={s.viewerImg} resizeMode="contain" />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* ─────────────────────────────────────────
   TICK  ✓ sent  ✓✓ delivered  ✓✓🔵 read
───────────────────────────────────────── */
function Tick({ status }: { status?: "sent" | "delivered" | "read" }) {
  // seen = blue double tick
  if (status === "read") {
    return (
      <View style={s.tickRow}>
        <Ionicons name="checkmark" size={13} color="#4FC3F7" style={{ marginRight: -8 }} />
        <Ionicons name="checkmark" size={13} color="#4FC3F7" />
      </View>
    );
  }
  // delivered = white/gray double tick
  if (status === "delivered") {
    return (
      <View style={s.tickRow}>
        <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.55)" style={{ marginRight: -8 }} />
        <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.55)" />
      </View>
    );
  }
  // sent = single gray tick
  return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.45)" />;
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function PrivateChat() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [text, setText] = useState("");
  const [friendName, setFriendName] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PrivateMessage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sendingImg, setSendingImg] = useState(false);
  const [viewerUri, setViewerUri] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);

  const headerY = useRef(new Animated.Value(-64)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const kbHeight = useRef(new Animated.Value(0)).current;

  /* ── entrance ── */
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.timing(listOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();

    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => Animated.timing(kbHeight, { toValue: e.endCoordinates.height, duration: Platform.OS === "ios" ? 240 : 140, useNativeDriver: false }).start()
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => Animated.timing(kbHeight, { toValue: 0, duration: Platform.OS === "ios" ? 240 : 140, useNativeDriver: false }).start()
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  /* ── init data + socket ── */
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token || !friendId) return;

      const fr = await fetch(`${BASE_URL}/api/requests/friends`, { headers: { Authorization: `Bearer ${token}` } });
      const friends: Friend[] = await fr.json();
      const friend = friends.find((f) => f._id === friendId);
      if (friend) { setFriendName(friend.name); setProfilePic(friend.profilePic || null); }

      const mr = await fetch(`${BASE_URL}/api/private-chat/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
      const old: PrivateMessage[] = await mr.json();
      setMessages(old);

      const socket = io(BASE_URL, { auth: { token }, transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-private-chat", { friendId });
        // Mark all existing unread messages from friend as seen
        socket.emit("message-seen", { friendId });
      });

      socket.on("new-private-message", (msg: PrivateMessage) => {
        setMessages((p) => [...p, msg]);
        setIsTyping(false);
        // If the message is FROM the friend (i.e. we are the receiver), mark it as seen
        if (msg.sender === friendId) {
          socket.emit("message-seen", { friendId, messageId: msg._id });
        }
      });

      // Friend has seen our messages → update all our sent messages to "read"
      socket.on("messages-read", ({ by }: { by: string }) => {
        if (by === friendId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender !== friendId && m.status !== "read"
                ? { ...m, status: "read" }
                : m
            )
          );
        }
      });

      socket.on("user-typing", ({ userId }: { userId: string }) => {
        if (userId === friendId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      });

      socket.on("user-online", ({ userId }: { userId: string }) => { if (userId === friendId) setIsOnline(true); });
      socket.on("user-offline", ({ userId }: { userId: string }) => { if (userId === friendId) setIsOnline(false); });
    };

    init();
    return () => { socketRef.current?.disconnect(); };
  }, [friendId]);

  /* ── auto scroll ── */
  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150)
    );
    return () => sub.remove();
  }, []);

  /* ── send text ── */
  const sendMessage = useCallback(() => {
    if (!text.trim() || !socketRef.current || !friendId) return;
    socketRef.current.emit("send-private-message", {
      friendId,
      message: text.trim(),
      ...(replyingTo ? { replyTo: replyingTo._id } : {}),
    });
    setText("");
    setReplyingTo(null);
  }, [text, friendId, replyingTo]);

  /* ── send image ── */
  const handleImagePicker = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission Required", "Please allow photo access"); return; }

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
      if (res.canceled) return;

      const token = await AsyncStorage.getItem("token");
      if (!token || !friendId) return;
      setSendingImg(true);

      const uri = res.assets[0].uri;
      const name = uri.split("/").pop() || "photo.jpg";
      const ext = /\.(\w+)$/.exec(name);
      const mime = ext ? `image/${ext[1]}` : "image/jpeg";

      const fd = new FormData();
      fd.append("receiverId", friendId as string);
      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        fd.append("image", blob, name);
      } else {
        fd.append("image", { uri, name, type: mime } as any);
      }

      const up = await fetch(`${BASE_URL}/api/private-chat/send-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await up.json();
      if (!data.success || !data.message) { Alert.alert("Error", data.error || "Upload failed"); return; }

      const saved: PrivateMessage = data.message;
      setMessages((p) => [...p, saved]);
      socketRef.current?.emit("send-private-image", { friendId, savedMessage: saved });
    } catch {
      Alert.alert("Error", "Failed to send image");
    } finally {
      setSendingImg(false);
    }
  };

  const handleTyping = (v: string) => {
    setText(v);
    socketRef.current?.emit("typing", { friendId });
  };

  /* ─────────────────────────────────────────
     RENDER MESSAGE
  ───────────────────────────────────────── */
  const renderMessage = useCallback(
    ({ item, index }: { item: PrivateMessage; index: number }) => {
      const isMe = item.sender !== friendId;
      const prev = index > 0 ? messages[index - 1] : null;
      const next = index < messages.length - 1 ? messages[index + 1] : null;
      const firstInGroup = !prev || prev.sender !== item.sender;
      const lastInGroup = !next || next.sender !== item.sender;
      const isImg = item.type === "image" || !!item.image;

      const showDateSep =
        !prev ||
        new Date(item.createdAt ?? "").toDateString() !== new Date(prev.createdAt ?? "").toDateString();

      const fmtTime = (d?: Date | string) =>
        d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

      const fmtDate = (d?: Date | string) => {
        if (!d) return "";
        const dt = new Date(d);
        const now = new Date();
        const yest = new Date(); yest.setDate(now.getDate() - 1);
        if (dt.toDateString() === now.toDateString()) return "Today";
        if (dt.toDateString() === yest.toDateString()) return "Yesterday";
        return dt.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      };

      // bubble shape helpers
      const myTL = BUBBLE_R, myTR = firstInGroup ? BUBBLE_R : 6, myBL = BUBBLE_R, myBR = lastInGroup ? 4 : 6;
      const thTL = firstInGroup ? BUBBLE_R : 6, thTR = BUBBLE_R, thBL = lastInGroup ? 4 : 6, thBR = BUBBLE_R;

      return (
        <View>
          {showDateSep && (
            <View style={s.dateSepRow}>
              <View style={s.dateSepLine} />
              <Text style={s.dateSepText}>{fmtDate(item.createdAt)}</Text>
              <View style={s.dateSepLine} />
            </View>
          )}

          <View style={[s.msgRow, isMe ? s.msgRowMe : s.msgRowThem, !lastInGroup && { marginBottom: 2 }]}>
            {/* Avatar placeholder for friend */}
            {!isMe && (
              <View style={s.avatarSlot}>
                {lastInGroup &&
                  (profilePic ? (
                    <Image source={{ uri: profilePic }} style={s.miniAvatar} />
                  ) : (
                    <LinearGradient colors={["#7C5CFC", "#C084FC"]} style={s.miniAvatar}>
                      <Text style={s.miniAvatarLetter}>{friendName?.[0]?.toUpperCase() ?? "?"}</Text>
                    </LinearGradient>
                  ))}
              </View>
            )}

            {/* Bubble */}
            <TouchableOpacity
              activeOpacity={0.88}
              onLongPress={() => setSelected(item._id || null)}
              onPress={() => {
                if (isImg && item.image) { setViewerUri(item.image); setViewerOpen(true); }
                else if (selected) setSelected(null);
              }}
              style={[
                s.bubble,
                isImg && s.bubbleImg,
                {
                  borderTopLeftRadius: isMe ? myTL : thTL,
                  borderTopRightRadius: isMe ? myTR : thTR,
                  borderBottomLeftRadius: isMe ? myBL : thBL,
                  borderBottomRightRadius: isMe ? myBR : thBR,
                },
              ]}
            >
              {/* For image messages: render bare (no gradient, no bg) */}
              {isImg ? (
                <BubbleContent
                  item={item}
                  isMe={isMe}
                  isImg={isImg}
                  fmtTime={fmtTime}
                  friendName={friendName}
                  friendId={friendId as string}
                />
              ) : isMe ? (
                /* Gradient wrapper only for text "me" bubbles */
                <LinearGradient
                  colors={["#7C5CFC", "#C084FC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.bubbleMeGrad}
                >
                  <BubbleContent
                    item={item}
                    isMe={isMe}
                    isImg={isImg}
                    fmtTime={fmtTime}
                    friendName={friendName}
                    friendId={friendId as string}
                  />
                </LinearGradient>
              ) : (
                /* White bg only for text "them" bubbles */
                <View style={s.bubbleThemInner}>
                  <BubbleContent
                    item={item}
                    isMe={isMe}
                    isImg={isImg}
                    fmtTime={fmtTime}
                    friendName={friendName}
                    friendId={friendId as string}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Context menu */}
          {selected === item._id && (
            <View style={[s.ctxMenu, isMe ? s.ctxMenuMe : s.ctxMenuThem]}>
              <TouchableOpacity
                style={s.ctxItem}
                onPress={() => { setReplyingTo(item); setSelected(null); }}
              >
                <Ionicons name="arrow-undo-outline" size={17} color="#7C5CFC" />
                <Text style={s.ctxText}>Reply</Text>
              </TouchableOpacity>

              {!isImg && (
                <TouchableOpacity style={s.ctxItem} onPress={() => { Alert.alert("Copied!"); setSelected(null); }}>
                  <Ionicons name="copy-outline" size={17} color="#7C5CFC" />
                  <Text style={s.ctxText}>Copy</Text>
                </TouchableOpacity>
              )}

              {isMe && (
                <TouchableOpacity
                  style={s.ctxItem}
                  onPress={() =>
                    Alert.alert("Delete", "Delete this message?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => setSelected(null) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  <Text style={[s.ctxText, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    },
    [messages, friendId, friendName, profilePic, selected]
  );

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFE" />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[s.flex, Platform.OS === "android" && { marginBottom: kbHeight }]}>

          {/* ── HEADER ── */}
          <Animated.View style={[s.header, { transform: [{ translateY: headerY }] }]}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={26} color="#1A1035" />
            </TouchableOpacity>
            <View style={s.headerMid}>
              <View style={s.hAvatarWrap}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={s.hAvatar} />
                ) : (
                  <LinearGradient colors={["#7C5CFC", "#C084FC"]} style={s.hAvatar}>
                    <Text style={s.hAvatarLetter}>{friendName?.[0]?.toUpperCase() ?? "?"}</Text>
                  </LinearGradient>
                )}
                {isOnline && <View style={s.onlineDot} />}
              </View>

              <View>
                <Text style={s.hName}>{friendName || "Friend"}</Text>
                <Text style={[s.hStatus, isTyping && s.hStatusTyping, isOnline && !isTyping && s.hStatusOnline]}>
                  {isTyping ? "typing…" : isOnline ? "online" : "last seen recently"}
                </Text>
              </View>

            </View>
            <View style={s.hActions}>
              <TouchableOpacity style={s.hBtn}>
                <Ionicons name="call-outline" size={21} color="#1A1035" />
              </TouchableOpacity>
              <TouchableOpacity style={s.hBtn}>
                <Ionicons name="videocam-outline" size={22} color="#1A1035" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── MESSAGES ── */}
          <Animated.View style={[s.flex, { opacity: listOpacity }]}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item, i) => item._id ?? String(i)}
              renderItem={renderMessage}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => setSelected(null)}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <LinearGradient colors={["#EDE9FF", "#F3E8FF"]} style={s.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={38} color="#7C5CFC" />
                  </LinearGradient>
                  <Text style={s.emptyTitle}>No messages yet</Text>
                  <Text style={s.emptySub}>Say hi to {friendName || "your friend"} 👋</Text>
                </View>
              }
            />
          </Animated.View>

          {/* ── TYPING INDICATOR ── */}
          {isTyping && (
            <View style={s.typingRow}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={s.typingAvatar} />
              ) : (
                <LinearGradient colors={["#7C5CFC", "#C084FC"]} style={s.typingAvatar}>
                  <Text style={s.miniAvatarLetter}>{friendName?.[0]?.toUpperCase() ?? "?"}</Text>
                </LinearGradient>
              )}
              <TypingDots />
            </View>
          )}

          {/* ── REPLY BAR ── */}
          {replyingTo && (
            <View style={s.replyBar}>
              <View style={s.replyBarAccent} />
              <View style={s.replyBarBody}>
                <Text style={s.replyBarName}>
                  Replying to{" "}
                  <Text style={{ color: "#7C5CFC" }}>
                    {replyingTo.sender === friendId ? friendName : "yourself"}
                  </Text>
                </Text>
                <Text style={s.replyBarMsg} numberOfLines={1}>
                  {replyingTo.image ? "📷 Image" : replyingTo.message}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={s.replyBarX}>
                <Ionicons name="close" size={19} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── INPUT BAR ── */}
          <BlurView intensity={95} tint="light" style={s.inputBar}>
            <TouchableOpacity style={s.sideBtn} onPress={handleImagePicker} disabled={sendingImg}>
              {sendingImg
                ? <ActivityIndicator size="small" color="#7C5CFC" />
                : <Ionicons name="image-outline" size={23} color="#7C5CFC" />}
            </TouchableOpacity>

            <View style={s.inputWrap}>
              <TextInput
                value={text}
                onChangeText={handleTyping}
                placeholder="Message…"
                placeholderTextColor="#BDB8D8"
                style={s.input}
                selectionColor="#7C5CFC"
                underlineColorAndroid="transparent"
                multiline
                maxLength={1000}
                onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300)}
              />
            </View>

            {text.trim() ? (
              <TouchableOpacity onPress={sendMessage} activeOpacity={0.82}>
                <LinearGradient colors={["#7C5CFC", "#C084FC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendBtn}>
                  <Ionicons name="send" size={17} color="#FFF" style={{ marginLeft: 2 }} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.sideBtn} onPress={() => Alert.alert("Voice Recording", "Coming soon!", [{ text: "OK" }])}>
                <Ionicons name="mic-outline" size={23} color="#7C5CFC" />
              </TouchableOpacity>
            )}
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>

      <ImageViewer uri={viewerUri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────
   BUBBLE CONTENT (shared for me/them)
───────────────────────────────────────── */
function BubbleContent({
  item, isMe, isImg, fmtTime, friendName, friendId,
}: {
  item: PrivateMessage;
  isMe: boolean;
  isImg: boolean;
  fmtTime: (d?: Date | string) => string;
  friendName: string;
  friendId: string;
}) {
  return (
    <>
      {/* Reply snippet */}
      {item.replyTo && (
        <View style={[s.replySnip, !isMe && s.replySnipThem]}>
          <View style={[s.replySnipBar, !isMe && s.replySnipBarThem]} />
          <View style={s.replySnipBody}>
            <Text style={[s.replySnipName, !isMe && s.replySnipNameThem]}>
              {item.replyTo.sender === friendId ? friendName : "You"}
            </Text>
            <Text style={[s.replySnipMsg, !isMe && s.replySnipMsgThem]} numberOfLines={1}>
              {item.replyTo.image ? "📷 Image" : item.replyTo.message}
            </Text>
          </View>
        </View>
      )}

      {/* Image */}
      {isImg && item.image ? (
        <View>
          <Image source={{ uri: item.image }} style={s.msgImg} resizeMode="cover" />
          <View style={s.imgMeta}>
            <Text style={s.imgMetaTime}>{fmtTime(item.createdAt)}</Text>
            {isMe && <Tick status={item.status} />}
          </View>
        </View>
      ) : (
        /* Text */
        <View style={s.textContent}>
          <Text style={[s.msgTxt, isMe ? s.msgTxtMe : s.msgTxtThem]}>
            {item.message}
            <Text style={{ color: "transparent", fontSize: 10 }}>{"    "}</Text>
          </Text>
          <View style={[s.metaRow, isMe ? s.metaRowMe : s.metaRowThem]}>
            <Text style={[s.metaTime, isMe ? s.metaTimeMe : s.metaTimeThem]}>
              {fmtTime(item.createdAt)}
            </Text>
            {isMe && <Tick status={item.status} />}
          </View>
        </View>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const s = StyleSheet.create({
  flex: { flex: 1 },

  root: {
    flex: 1,
    backgroundColor: "#FAFAFE",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE9FF",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 2 },
  headerMid: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  hAvatarWrap: { position: "relative" },
  hAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", backgroundColor: "#EDE9FF" },
  hAvatarLetter: { color: "#FFF", fontWeight: "800", fontSize: 17 },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#FFF" },
  hName: { fontSize: 15.5, fontWeight: "700", color: "#1A1035", letterSpacing: 0.1 },
  hStatus: { fontSize: 12, color: "#B0B8C9", marginTop: 1 },
  hStatusOnline: { color: "#22C55E", fontWeight: "500" },
  hStatusTyping: { color: "#7C5CFC", fontWeight: "500" },
  hActions: { flexDirection: "row", gap: 4 },
  hBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5F3FF", justifyContent: "center", alignItems: "center" },

  /* LIST */
  list: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 },

  /* DATE SEPARATOR */
  dateSepRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 10 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: "#E5E0FF" },
  dateSepText: { fontSize: 11, fontWeight: "600", color: "#A89DD0", letterSpacing: 0.6, textTransform: "uppercase" },

  /* MESSAGE ROW */
  msgRow: { flexDirection: "row", marginVertical: 2, alignItems: "flex-end" },
  msgRowMe: { justifyContent: "flex-end", paddingLeft: 52 },
  msgRowThem: { justifyContent: "flex-start", paddingRight: 52 },

  avatarSlot: { width: 34, marginRight: 6, alignItems: "center", justifyContent: "flex-end", alignSelf: "flex-end" },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  miniAvatarLetter: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  /* BUBBLE */
  bubble: { maxWidth: SCREEN_W * 0.74, overflow: "hidden" },
  bubbleImg: { backgroundColor: "transparent" },

  bubbleMeGrad: { paddingHorizontal: 14, paddingVertical: 10 },

  bubbleThemInner: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },

  /* TEXT INSIDE BUBBLE */
  textContent: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  msgTxt: { fontSize: 15, lineHeight: 21, flexShrink: 1, flexGrow: 1 },
  msgTxtMe: { color: "#FFFFFF" },
  msgTxtThem: { color: "#1A1035" },

  /* META (time + tick) */
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 4, marginBottom: 1, flexShrink: 0 },
  metaRowMe: {},
  metaRowThem: {},
  metaTime: { fontSize: 10, fontWeight: "500" },
  metaTimeMe: { color: "rgba(255,255,255,0.6)" },
  metaTimeThem: { color: "#B0B8C9" },

  tickRow: { flexDirection: "row", alignItems: "center" },

  /* IMAGE INSIDE BUBBLE */
  msgImg: { width: SCREEN_W * 0.38, height: SCREEN_W * 0.38, borderRadius: BUBBLE_R - 2 },
  imgMeta: {
    position: "absolute", bottom: 8, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  imgMetaTime: { fontSize: 10, color: "#FFF", fontWeight: "500" },

  /* REPLY SNIPPET INSIDE BUBBLE */
  replySnip: {
    flexDirection: "row", gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10,
    marginBottom: 6, padding: 8,
  },
  replySnipThem: { backgroundColor: "rgba(124,92,252,0.08)" },
  replySnipBar: { width: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.85)" },
  replySnipBarThem: { backgroundColor: "#7C5CFC" },
  replySnipBody: { flex: 1 },
  replySnipName: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.95)", marginBottom: 2 },
  replySnipNameThem: { color: "#7C5CFC" },
  replySnipMsg: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  replySnipMsgThem: { color: "#9B8EC4" },

  /* CONTEXT MENU */
  ctxMenu: {
    flexDirection: "row", backgroundColor: "#FFF", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, gap: 18, marginVertical: 4,
    shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 12, elevation: 8,
  },
  ctxMenuMe: { alignSelf: "flex-end", marginRight: 4 },
  ctxMenuThem: { alignSelf: "flex-start", marginLeft: 40 },
  ctxItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  ctxText: { fontSize: 13, fontWeight: "600", color: "#7C5CFC" },

  /* EMPTY */
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1A1035", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#A89DD0", textAlign: "center" },

  /* TYPING */
  typingRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  typingAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  typingBubble: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, borderBottomLeftRadius: 4, gap: 5,
    shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C084FC" },

  /* REPLY BAR */
  replyBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#EEE9FF",
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  replyBarAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: "#7C5CFC" },
  replyBarBody: { flex: 1 },
  replyBarName: { fontSize: 13, fontWeight: "600", color: "#1A1035", marginBottom: 2 },
  replyBarMsg: { fontSize: 13, color: "#A89DD0" },
  replyBarX: { padding: 5 },

  /* INPUT BAR */
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 10, paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1, borderTopColor: "#EEE9FF",
    backgroundColor: "rgba(255,255,255,0.9)",
    gap: 8,
  },
  sideBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0ECFF", justifyContent: "center", alignItems: "center" },
  inputWrap: {
    flex: 1, backgroundColor: "#F5F3FF", borderRadius: 22,
    borderWidth: 1.5, borderColor: "#DDD6FF",
    paddingHorizontal: 14, paddingVertical: 8, minHeight: 42, maxHeight: 110, justifyContent: "center",
  },
  input: { fontSize: 15, color: "#1A1035", lineHeight: 20, padding: 0 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center",
    shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
  },

  /* IMAGE VIEWER */
  viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", justifyContent: "center", alignItems: "center" },
  viewerCloseBtn: { position: "absolute", top: Platform.OS === "ios" ? 54 : 34, right: 18, zIndex: 10, borderRadius: 22, overflow: "hidden" },
  viewerCloseBlur: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)" },
  viewerImg: { width: SCREEN_W - 24, height: SCREEN_H * 0.74, borderRadius: 16 },
});

