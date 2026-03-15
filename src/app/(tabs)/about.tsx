import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: W } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "shield-checkmark",
    color: "#7C5CFC",
    bg: "#EDE9FF",
    title: "100% Anonymous",
    desc: "Your identity is never revealed. Chat freely without fear.",
  },
  {
    icon: "people",
    color: "#06B6D4",
    bg: "#E0F7FA",
    title: "Verified Students",
    desc: "Only real college students with valid .edu emails can join.",
  },
  {
    icon: "chatbubbles",
    color: "#EC4899",
    bg: "#FCE7F3",
    title: "Smart Matching",
    desc: "Get paired with students who share your interests and vibe.",
  },
  {
    icon: "lock-closed",
    color: "#10B981",
    bg: "#D1FAE5",
    title: "End-to-End Safe",
    desc: "Messages are moderated. Zero tolerance for harassment.",
  },
  {
    icon: "flash",
    color: "#F59E0B",
    bg: "#FEF3C7",
    title: "Real-Time Chat",
    desc: "Instant messaging powered by WebSockets. Zero lag.",
  },
  {
    icon: "heart",
    color: "#EF4444",
    bg: "#FEE2E2",
    title: "Make Friends",
    desc: "Connect anonymously, then add each other as friends.",
  },
];

const STATS = [
  { value: "10K+", label: "Students" },
  { value: "50K+", label: "Chats Daily" },
  { value: "200+", label: "Colleges" },
  { value: "4.8★", label: "Rating" },
];

const TEAM = [
  { name: "Vishnu", role: "Founder & CEO", emoji: "", grad: ["#7C5CFC", "#C084FC"] as [string,string] },
  { name: "Design", role: "UI/UX", emoji: "", grad: ["#EC4899", "#F472B6"] as [string,string] },
  { name: "Backend", role: "Engineering", emoji: "", grad: ["#06B6D4", "#67E8F9"] as [string,string] },
];


function FadeCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 9, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function AboutScreen() {
  const router = useRouter();

  const heroScale = useRef(new Animated.Value(0.88)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient colors={["#F5F3FF", "#EEF2FF", "#F0FDF4"]} style={StyleSheet.absoluteFill} />

      <View style={[s.blob, { top: -60, right: -60, backgroundColor: "#DDD6FE", width: 180, height: 180 }]} />
      <View style={[s.blob, { top: 200, left: -80, backgroundColor: "#BFDBFE", width: 160, height: 160 }]} />
      <View style={[s.blob, { bottom: 100, right: -40, backgroundColor: "#BBF7D0", width: 140, height: 140 }]} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#1A1035" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >

        <Animated.View style={[s.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
          <LinearGradient
            colors={["#7C5CFC", "#A855F7", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroBg}
          >
            <View style={[s.heroCircle, { width: 120, height: 120, top: -30, right: -30, opacity: 0.15 }]} />
            <View style={[s.heroCircle, { width: 80, height: 80, bottom: 10, left: -20, opacity: 0.12 }]} />
            <View style={[s.heroCircle, { width: 50, height: 50, top: 40, left: 30, opacity: 0.1 }]} />

            <View style={s.heroLogoWrap}>
              <Text style={s.heroLogoText}>U</Text>
            </View>
            <Text style={s.heroTitle}>UniTalk</Text>
            <Text style={s.heroTagline}>Where Campus Connections Begin</Text>
            <View style={s.heroBadge}>
              <View style={s.heroBadgeDot} />
              <Text style={s.heroBadgeText}>v2.0 • Now Live</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <FadeCard delay={100} style={s.section}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrap, { backgroundColor: "#EDE9FF" }]}>
                <Ionicons name="bulb" size={20} color="#7C5CFC" />
              </View>
              <Text style={s.cardTitle}>Our Mission</Text>
            </View>
            <Text style={s.missionText}>
              UniTalk was built because making friends in college is{" "}
              <Text style={s.highlight}>harder than it should be</Text>. We
              created a space where students can connect authentically —
              anonymously at first, then meaningfully.
            </Text>
            <Text style={s.missionText}>
              No judgment. No awkward introductions. Just real conversations
              between real students on your campus.
            </Text>
          </View>
        </FadeCard>

        <FadeCard delay={180}>
          <LinearGradient
            colors={["#7C5CFC", "#C084FC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.statsCard}
          >
            {STATS.map((stat, i) => (
              <React.Fragment key={i}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
                {i < STATS.length - 1 && <View style={s.statDivider} />}
              </React.Fragment>
            ))}
          </LinearGradient>
        </FadeCard>

        <FadeCard delay={240} style={s.section}>
          <Text style={s.sectionTitle}>Why UniTalk?</Text>
          <View style={s.featuresGrid}>
            {FEATURES.map((f, i) => (
              <FadeCard key={i} delay={280 + i * 60} style={s.featureCard}>
                <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={22} color={f.color} />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </FadeCard>
            ))}
          </View>
        </FadeCard>

        <FadeCard delay={400} style={s.section}>
          <Text style={s.sectionTitle}>How It Works</Text>
          <View style={s.card}>
            {[
              { step: "1", icon: "person-add", color: "#7C5CFC", text: "Sign up with your college email" },
              { step: "2", icon: "search", color: "#EC4899", text: "Get matched with a random student" },
              { step: "3", icon: "chatbubbles", color: "#06B6D4", text: "Chat anonymously — no names shown" },
              { step: "4", icon: "heart", color: "#EF4444", text: "Send a friend request if you vibe" },
              { step: "5", icon: "people", color: "#10B981", text: "Connect privately and stay in touch" },
            ].map((item, i) => (
              <View key={i} style={[s.stepRow, i < 4 && s.stepRowBorder]}>
                <LinearGradient
                  colors={[item.color, item.color + "BB"]}
                  style={s.stepNumWrap}
                >
                  <Text style={s.stepNum}>{item.step}</Text>
                </LinearGradient>
                <View style={s.stepIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={s.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </FadeCard>

        <FadeCard delay={500} style={s.section}>
          <Text style={s.sectionTitle}>The Team</Text>
          <View style={s.teamRow}>
            {TEAM.map((member, i) => (
              <FadeCard key={i} delay={540 + i * 80} style={s.teamCard}>
                <LinearGradient colors={member.grad} style={s.teamAvatar}>
                  <Text style={s.teamEmoji}>{member.emoji}</Text>
                </LinearGradient>
                <Text style={s.teamName}>{member.name}</Text>
                <Text style={s.teamRole}>{member.role}</Text>
              </FadeCard>
            ))}
          </View>
        </FadeCard>

        <FadeCard delay={620} style={s.section}>
          <Text style={s.sectionTitle}>Connect With Us</Text>
          <View style={s.linksCol}>
            {[
              { icon: "mail", label: "unitalkchat@gmail.com", color: "#7C5CFC", bg: "#EDE9FF", action: () => Linking.openURL("mailto:unitalkchat@gmail.com") },
              { icon: "globe", label: "unitalk.app", color: "#06B6D4", bg: "#E0F7FA", action: () => Linking.openURL("https://unitalk.app") },
              { icon: "logo-instagram", label: "@unitalk_2301", color: "#EC4899", bg: "#FCE7F3", action: () => Linking.openURL("https://instagram.com/unitalk_2301") },
              { icon: "document-text", label: "Privacy Policy", color: "#10B981", bg: "#D1FAE5", action: () => {} },
              { icon: "shield", label: "Terms of Service", color: "#F59E0B", bg: "#FEF3C7", action: () => {} },
            ].map((link, i) => (
              <TouchableOpacity key={i} style={s.linkRow} onPress={link.action} activeOpacity={0.75}>
                <View style={[s.linkIcon, { backgroundColor: link.bg }]}>
                  <Ionicons name={link.icon as any} size={18} color={link.color} />
                </View>
                <Text style={s.linkLabel}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#C4B5FD" />
              </TouchableOpacity>
            ))}
          </View>
        </FadeCard>

        <FadeCard delay={700}>
          <View style={s.footer}>
            <LinearGradient colors={["#7C5CFC", "#A855F7"]} style={s.footerLogo}>
              <Text style={s.footerLogoText}>U</Text>
            </LinearGradient>
            <Text style={s.footerName}>UniTalk</Text>
            <Text style={s.footerTagline}>Made with ❤️ for students, by students</Text>
            <Text style={s.footerVersion}>Version 2.0.0 • © 2025 UniTalk</Text>
          </View>
        </FadeCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F3FF" },

  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.45,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1035",
    letterSpacing: 0.2,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  hero: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroBg: {
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  heroLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroLogoText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  heroBadgeText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1035",
    marginBottom: 14,
    letterSpacing: -0.3,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1035",
  },
  missionText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 10,
  },
  highlight: {
    color: "#7C5CFC",
    fontWeight: "700",
  },

  statsCard: {
    flexDirection: "row",
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.25)" },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    width: (W - 32 - 12) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1035",
    marginBottom: 5,
  },
  featureDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  stepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F0FF",
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stepNum: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stepText: { fontSize: 14, color: "#374151", fontWeight: "500", flex: 1, lineHeight: 20 },

  teamRow: {
    flexDirection: "row",
    gap: 12,
  },
  teamCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  teamAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  teamEmoji: { fontSize: 24 },
  teamName: { fontSize: 14, fontWeight: "700", color: "#1A1035", marginBottom: 3 },
  teamRole: { fontSize: 11, color: "#9B8EC4", fontWeight: "500" },

  linksCol: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F3FF",
    gap: 14,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1035" },

  footer: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  footerLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  footerLogoText: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
  footerName: { fontSize: 20, fontWeight: "900", color: "#1A1035", letterSpacing: -0.3 },
  footerTagline: { fontSize: 13, color: "#9B8EC4", fontWeight: "500" },
  footerVersion: { fontSize: 11, color: "#C4B5FD", fontWeight: "500", marginTop: 4 },
});