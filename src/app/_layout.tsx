
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import BottomNav from "@/src/components/BottomNav";
import { RequestCountProvider, useRequestCount } from "@/src/context/RequestCountContext";

const HIDE_NAV_ROUTES = ["/private-chat", "/chat"];

function LayoutInner() {
  const { requestCount } = useRequestCount();
  const pathname = usePathname();

  const hideNav = HIDE_NAV_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {!hideNav && <BottomNav requestCount={requestCount} />}
    </View>
  );
}

export default function Layout() {
  return (
    <RequestCountProvider>
      <LayoutInner />
    </RequestCountProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});