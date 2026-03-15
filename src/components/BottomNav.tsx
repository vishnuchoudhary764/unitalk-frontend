
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const NAV_ITEMS = [
  {
    route: "/home",
    label: "Home",
    icon: "home",
    iconOutline: "home-outline",
  },
  {
    route: "/requests",
    label: "Requests",
    icon: "mail",
    iconOutline: "mail-outline",
    badge: true,
  },
  {
    route: "/friends",
    label: "Friends",
    icon: "people",
    iconOutline: "people-outline",
  },
  {
    route: "/settings",
    label: "Settings",
    icon: "settings",
    iconOutline: "settings-outline",
  },
];

interface BottomNavProps {
  requestCount?: number;
}

export default function BottomNav({ requestCount = 0 }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => pathname === route;

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={styles.navItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons
                    name={(active ? item.icon : item.iconOutline) as any}
                    size={24}
                    color={active ? "#667EEA" : "#6B7280"}
                  />
                  {item.badge && requestCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {requestCount > 9 ? "9+" : requestCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// NAV_HEIGHT export so screens can use it for paddingBottom
export const NAV_HEIGHT = Platform.OS === "ios" ? 84 : 72;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  blur: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.08)",
  },

  nav: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  iconWrapper: {
    position: "relative",
  },

  label: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },

  labelActive: {
    color: "#667EEA",
    fontWeight: "700",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});