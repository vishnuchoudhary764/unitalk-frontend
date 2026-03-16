
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import BottomNav from "@/src/components/BottomNav";
import { RequestCountProvider, useRequestCount } from "@/src/context/RequestCountContext";

const SHOW_NAV_ROUTES = ["/home", "/friends", "/requests"];

function LayoutInner() {
  const { requestCount } = useRequestCount();
  const pathname = usePathname();

 const showNav = SHOW_NAV_ROUTES.includes(pathname);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {showNav && <BottomNav requestCount={requestCount} />}
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