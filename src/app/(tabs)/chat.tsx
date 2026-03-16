
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
  SafeAreaView,
  Animated,
  Keyboard,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { connectSocket, disconnectSocket, getSocket } from "../../hooks/socket";
import { Socket } from "socket.io-client";

const { width: SCREEN_W } = Dimensions.get("window");

const EMOJI_CATS = [
  {
    label: "😊",
    name: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
      "🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫",
      "🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬",
    ],
  },
  {
    label: "❤️",
    name: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️",
      "✌️","🤞","🤟","🤘","👌","🤌","👍","👏","🙌","🫶",
    ],
  },
  {
    label: "🎉",
    name: "Fun",
    emojis: [
      "🎉","🎊","🎈","🎁","🎀","🎗️","🏆","🥇","🎯","🎮",
      "🕹️","🎲","🃏","🎭","🎨","🎬","🎤","🎧","🎼","🎹",
      "🥁","🎷","🎺","🎸","🪕","🎻","🎵","🎶","🎙️","📻",
    ],
  },
  {
    label: "🐶",
    name: "Animals",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧",
      "🐦","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝",
    ],
  },
  {
    label: "🍕",
    name: "Food",
    emojis: [
      "🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🥞",
      "🧇","🧈","🍞","🥐","🥨","🧀","🥗","🍝","🍜","🍛",
      "🍣","🍱","🥟","🍤","🍙","🍘","🍥","🥮","🍢","🧆",
    ],
  },
  {
    label: "🌍",
    name: "Travel",
    emojis: [
      "🌍","🌎","🌏","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️",
      "🏖️","🏜️","🏝️","🏞️","🏟️","🏛️","🏗️","🏘️","🏚️","🏠",
      "🚀","✈️","🚂","🚢","🚁","🛸","🌅","🌄","🌠","🎆",
    ],
  },
];

interface ChatMessage {
  message: string;
  me: boolean;
  timestamp?: Date;
}

export default function Chat() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [text,      setText]      = useState("");
  const [status,    setStatus]    = useState("");
  const [isTyping,  setIsTyping]  = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCat, setActiveCat] = useState(0);

  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const slideAnim     = useRef(new Animated.Value(20)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const emojiPanelH   = useRef(new Animated.Value(0)).current;
  const sendScale     = useRef(new Animated.Value(1)).current;

  const showToast = (msg: string) => {
    setToast(msg);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();

    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setShowEmoji(false);
        Animated.timing(emojiPanelH, { toValue: 0, duration: 150, useNativeDriver: false }).start();
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === "ios" ? 250 : 200,
          useNativeDriver: false,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 250 : 200,
        useNativeDriver: false,
      }).start()
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const socket = connectSocket(token);
      socketRef.current = socket;
      socket.emit("find-match");

      socket.on("waiting",     () => setStatus("Searching for a chat partner..."));
      socket.on("match-found", () => { setMessages([]); setStatus("Connected • Anonymous Chat"); });

      socket.on("new-message", (data: any) => {
        setMessages((prev) => [...prev, { message: data.message, me: false, timestamp: new Date() }]);
        setIsTyping(false);
      });

      socket.on("friend-request-sent", () => {
        showToast("Friend request sent");
      });

      socket.on("friend-request-already-sent", () => {
        showToast("You already sent a friend request!");
      });

      socket.on("friend-request-received", () => {
        showToast(" Opponent sent you a friend request!");
      });

      socket.on("already-friends", ({ friendId }: { friendId: string }) => {
        setStatus("You're already friends! Redirecting…");
        showToast("You're already friends!");
        setTimeout(() => {
          disconnectSocket();
          router.replace({
            pathname: "/(tabs)/private-chat",
            params: { friendId },
          });
        }, 1500);
      });

      socket.on("friend-request-accepted", ({ friendId }: { friendId: string }) => {
        disconnectSocket();
        router.replace({
          pathname: "/(tabs)/private-chat",
          params: { friendId },
        });
      });

      socket.on("chat-ended", ({ message }: { message: string }) => {
        setStatus(message || "Chat ended");
        setMessages([]);
        setTimeout(() => { disconnectSocket(); router.replace({ pathname: "/home" }); }, 2000);
        autoRematch();
      });
    };

    init();
    return () => { disconnectSocket(); socketRef.current = null; };
  }, []);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    );
    return () => sub.remove();
  }, []);

  const sendMessage = useCallback(() => {
    if (!text.trim() || !socketRef.current?.connected) return;
    const msg = text.trim();

    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.82, useNativeDriver: true, tension: 300 }),
      Animated.spring(sendScale, { toValue: 1,    useNativeDriver: true, tension: 300 }),
    ]).start();

    setMessages((prev) => [...prev, { message: msg, me: true, timestamp: new Date() }]);
    socketRef.current.emit("send-message", { message: msg });
    setText("");
  }, [text]);

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const toggleEmoji = () => {
    if (!showEmoji) {
      Keyboard.dismiss();
      setShowEmoji(true);
      Animated.spring(emojiPanelH, { toValue: 300, tension: 60, friction: 12, useNativeDriver: false }).start();
    } else {
      setShowEmoji(false);
      Animated.timing(emojiPanelH, { toValue: 0, duration: 180, useNativeDriver: false }).start(
        () => inputRef.current?.focus()
      );
    }
  };

  const sendFriendRequest = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send-friend-request");
    }
  };

  const endChat = () => {
    socketRef.current?.emit("end-chat");
    setStatus("You ended the chat");
    setTimeout(() => { disconnectSocket(); router.replace({ pathname: "/" }); }, 2000);
    autoRematch();
  };

  const skipChat = () => {
    socketRef.current?.emit("end-chat");
    setStatus("Finding new chat partner...");
    setMessages([]);
    autoRematch();
  };

  const autoRematch = () => {
    const socket = getSocket();
    setTimeout(() => socket?.emit("find-match"), 2000);
  };

  const hasText = text.trim().length > 0;

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient colors={["#F0EEFF", "#EAF0FF", "#F5F3FF"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[s.flex, Platform.OS === "android" && { marginBottom: keyboardHeight }]}>

          <View style={s.header}>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#1A1035" />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Anonymous Chat</Text>
              {status ? <Text style={s.headerSub}>{status}</Text> : null}
            </View>
            <TouchableOpacity style={s.headerBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#1A1035" />
            </TouchableOpacity>
          </View>

          {status ? (
            <Animated.View style={[s.statusBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={s.statusInner}>
                <View style={[s.statusDot, status.includes("Connected") ? s.statusDotGreen : s.statusDotPurple]} />
                <Text style={s.statusText}>{status}</Text>
              </View>
            </Animated.View>
          ) : null}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => { if (showEmoji) toggleEmoji(); }}
            renderItem={({ item }) => (
              <View style={[s.msgRow, item.me ? s.msgRowMe : s.msgRowThem]}>
                <View style={[s.bubble, item.me ? s.bubbleMe : s.bubbleThem]}>
                  {item.me ? (
                    <LinearGradient colors={["#7C5CFC", "#C084FC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bubbleMeGrad}>
                      <Text style={s.bubbleMeText}>{item.message}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={s.bubbleThemInner}>
                      <Text style={s.bubbleThemText}>{item.message}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <LinearGradient colors={["#EDE9FF", "#F3E8FF"]} style={s.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={44} color="#7C5CFC" />
                </LinearGradient>
                <Text style={s.emptyTitle}>No messages yet</Text>
                <Text style={s.emptySub}>Say something to break the ice 👋</Text>
              </View>
            }
          />

          {isTyping && (
            <View style={s.typingRow}>
              <View style={s.typingBubble}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[s.typingDot, { opacity: 1 - i * 0.25 }]} />
                ))}
              </View>
            </View>
          )}

          <View style={s.actions}>
            <TouchableOpacity onPress={sendFriendRequest} style={s.frBtn} activeOpacity={0.85}>
              <LinearGradient colors={["#EC4899", "#F472B6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.frGrad}>
                <Ionicons name="heart" size={17} color="#FFF" />
                <Text style={s.frText}>Add Friend</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.actionRow}>
              <TouchableOpacity onPress={skipChat} style={s.skipBtn} activeOpacity={0.8}>
                <Ionicons name="refresh" size={17} color="#7C5CFC" />
                <Text style={s.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={endChat} style={s.endBtn} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={17} color="#EF4444" />
                <Text style={s.endText}>End</Text>
              </TouchableOpacity>
            </View>
          </View>

          <BlurView intensity={92} tint="light" style={s.inputBar}>
            <View style={s.inputRow}>
              <TouchableOpacity onPress={toggleEmoji} style={s.inputIconBtn} activeOpacity={0.75}>
                <Animated.View style={{ transform: [{ rotate: showEmoji ? "45deg" : "0deg" }] }}>
                  <Ionicons
                    name={showEmoji ? "close-circle" : "happy-outline"}
                    size={26}
                    color={showEmoji ? "#EF4444" : "#7C5CFC"}
                  />
                </Animated.View>
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor="#BDB8D8"
                style={s.input}
                selectionColor="#7C5CFC"
                underlineColorAndroid="transparent"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                onFocus={() => {
                  if (showEmoji) toggleEmoji();
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
                }}
                multiline
                maxLength={500}
              />

              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                {hasText ? (
                  <TouchableOpacity onPress={sendMessage} activeOpacity={0.85}>
                    <LinearGradient colors={["#7C5CFC", "#C084FC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendBtn}>
                      <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.micBtn} activeOpacity={0.8}>
                    <Ionicons name="mic" size={22} color="#7C5CFC" />
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>
          </BlurView>

          <Animated.View style={[s.emojiPanel, { height: emojiPanelH }]}>
            {showEmoji && (
              <>
                <View style={s.emojiTabs}>
                  {EMOJI_CATS.map((cat, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.emojiTab, activeCat === i && s.emojiTabActive]}
                      onPress={() => setActiveCat(i)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.emojiTabLabel}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={s.emojiGrid}
                >
                  {EMOJI_CATS[activeCat].emojis.map((emoji, i) => (
                    <TouchableOpacity key={i} style={s.emojiCell} onPress={() => insertEmoji(emoji)} activeOpacity={0.6}>
                      <Text style={s.emojiChar}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Animated.View>

        </Animated.View>
      </KeyboardAvoidingView>

      {toast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <BlurView intensity={75} tint="dark" style={s.toastBlur}>
            <Text style={s.toastText}>{toast}</Text>
          </BlurView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}


const COLS = 8;
const CELL = Math.floor((SCREEN_W - 16) / COLS);

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: "#F5F3FF" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 16,
    paddingTop:40,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#EEE9FF",
    shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 4,
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F5F3FF", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1035", letterSpacing: 0.1 },
  headerSub: { fontSize: 11, color: "#9B8EC4", marginTop: 1, fontWeight: "500" },

  statusBanner: { marginHorizontal: 14, marginVertical: 8, borderRadius: 14, overflow: "hidden", backgroundColor: "#FFFFFF", shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statusInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusDotGreen: { backgroundColor: "#22C55E" },
  statusDotPurple: { backgroundColor: "#7C5CFC" },
  statusText: { fontSize: 13, fontWeight: "600", color: "#1A1035", flex: 1 },

  list: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  msgRow: { marginVertical: 3 },
  msgRowMe: { alignItems: "flex-end" },
  msgRowThem: { alignItems: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 18, overflow: "hidden" },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleMeGrad: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMeText: { fontSize: 15, color: "#FFF", lineHeight: 21 },
  bubbleThemInner: { backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1 },
  bubbleThemText: { fontSize: 15, color: "#1A1035", lineHeight: 21 },

  empty: { flex: 1, alignItems: "center", paddingTop: 80 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1A1035", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#A89DD0" },

  typingRow: { paddingHorizontal: 16, paddingBottom: 4 },
  typingBubble: { flexDirection: "row", alignSelf: "flex-start", backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomLeftRadius: 4, gap: 5, shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C084FC" },

  actions: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  frBtn: { borderRadius: 14, overflow: "hidden", shadowColor: "#EC4899", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  frGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, gap: 7 },
  frText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  actionRow: { flexDirection: "row", gap: 10 },
  skipBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", paddingVertical: 11, borderRadius: 12, gap: 6, borderWidth: 1.5, borderColor: "#7C5CFC" },
  skipText: { fontSize: 14, fontWeight: "700", color: "#7C5CFC" },
  endBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", paddingVertical: 11, borderRadius: 12, gap: 6, borderWidth: 1.5, borderColor: "#EF4444" },
  endText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },

  inputBar: { borderTopWidth: 0, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 24 : 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#F0ECFF", borderRadius: 28, paddingHorizontal: 6, paddingVertical: 5, borderWidth: 1.5, borderColor: "#DDD6FF" },
  inputIconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, fontSize: 15, color: "#1A1035", lineHeight: 20, paddingHorizontal: 4, paddingVertical: 0, margin: 0, minHeight: 36, maxHeight: 110, textAlignVertical: "center", borderWidth: 0, borderColor: "transparent", backgroundColor: "transparent" },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", shadowColor: "#7C5CFC", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  micBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },

  emojiPanel: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEE9FF", overflow: "hidden" },
  emojiTabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F0ECFF", paddingHorizontal: 8, backgroundColor: "#FAFAFE" },
  emojiTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  emojiTabActive: { borderBottomColor: "#7C5CFC" },
  emojiTabLabel: { fontSize: 20 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, paddingVertical: 8 },
  emojiCell: { width: CELL, height: CELL, justifyContent: "center", alignItems: "center" },
  emojiChar: { fontSize: 26 },

  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  toastBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "rgba(26,16,53,0.75)",
  },
  toastText: { fontSize: 14, color: "#FFF", fontWeight: "600", textAlign: "center" },
});