
// import { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   Alert,
//   ActivityIndicator,
// } from "react-native";
// import { useRouter, useLocalSearchParams } from "expo-router";
// import * as ImagePicker from "expo-image-picker";
// import { Ionicons } from "@expo/vector-icons";
// import BASE_URL from "@/src/config/api";

// const defaultAvatar = require("../../assets/uniTalk.png");

// export default function SignupScreen() {
//   const router = useRouter();
//   const { email } = useLocalSearchParams<{ email: string }>();

//   const [name, setName] = useState("");
//   const [gender, setGender] = useState("");
//   const [password, setPassword] = useState("");
//   const [profilePicUrl, setProfilePicUrl] = useState<string>(""); 
//   const [localImageUri, setLocalImageUri] = useState<string>(""); 
//   const [uploading, setUploading] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const isValid =
//     name.trim().length >= 2 &&
//     (gender === "Male" || gender === "Female") &&
//     password.length >= 6;

//   const pickImage = async () => {
//     try {
//       const permission =
//         await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!permission.granted) {
//         Alert.alert(
//           "Permission required",
//           "Please allow access to your photo library."
//         );
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.7,
//         base64: true, 
//       });

//       if (result.canceled || !result.assets[0]) return;

//       const asset = result.assets[0];
//       setLocalImageUri(asset.uri); 

//       setUploading(true);
//       const base64Image = `data:image/jpeg;base64,${asset.base64}`;

//       const res = await fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ image: base64Image }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         Alert.alert("Upload failed", data.message || "Could not upload image");
//         setLocalImageUri(""); 
//         return;
//       }

//       setProfilePicUrl(data.url); 
//     } catch (err) {
//       Alert.alert("Error", "Failed to pick or upload image");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSignup = async () => {
//     try {
//       setLoading(true);

//       const res = await fetch(`${BASE_URL}/api/auth/complete-signup`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           email,
//           name,
//           gender,
//           password,
//           profilePic: profilePicUrl, 
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         Alert.alert("Error", data.message || "Signup failed");
//         return;
//       }

//       Alert.alert("Success", "Account created successfully!");
//       router.replace("/(auth)/login");
//     } catch {
//       Alert.alert("Error", "Server not reachable");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//       style={styles.container}
//     >
//       <Text style={styles.title}>Sign Up</Text>
//       <Text style={styles.subtitle}>Fill in your details to get started</Text>

//       <TouchableOpacity
//         style={styles.avatarWrapper}
//         onPress={pickImage}
//         disabled={uploading}
//       >
//         <View style={styles.avatarContainer}>
//           <Image
//             source={
//               localImageUri ? { uri: localImageUri } : defaultAvatar
//             }
//             style={styles.avatar}
//           />
//           <View style={styles.avatarOverlay}>
//             {uploading ? (
//               <ActivityIndicator size="small" color="#FFFFFF" />
//             ) : (
//               <Ionicons name="camera" size={20} color="#FFFFFF" />
//             )}
//           </View>
//         </View>
//         <Text style={styles.editText}>
//           {uploading
//             ? "Uploading..."
//             : localImageUri
//             ? "Change Photo"
//             : "Add Photo"}
//         </Text>
//       </TouchableOpacity>

//       <Text style={styles.label}>Name</Text>
//       <TextInput
//         value={name}
//         onChangeText={setName}
//         style={styles.input}
//         placeholder="Your full name"
//         placeholderTextColor="#94A3B8"
//       />

//       <Text style={styles.label}>Gender</Text>
//       <View style={styles.genderRow}>
//         {["Male", "Female"].map((item) => (
//           <TouchableOpacity
//             key={item}
//             onPress={() => setGender(item)}
//             style={[
//               styles.genderButton,
//               gender === item && styles.genderButtonActive,
//             ]}
//           >
//             <Text
//               style={[
//                 styles.genderText,
//                 gender === item && styles.genderTextActive,
//               ]}
//             >
//               {item === "Male" ? " Male" : " Female"}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       <Text style={styles.label}>Password</Text>
//       <View style={styles.passwordWrapper}>
//         <TextInput
//           secureTextEntry={!showPassword}
//           value={password}
//           onChangeText={setPassword}
//           style={styles.passwordInput}
//           placeholder="Min. 6 characters"
//           placeholderTextColor="#94A3B8"
//         />
//         <TouchableOpacity
//           onPress={() => setShowPassword((p) => !p)}
//           style={styles.eyeButton}
//         >
//           <Ionicons
//             name={showPassword ? "eye-off-outline" : "eye-outline"}
//             size={20}
//             color="#94A3B8"
//           />
//         </TouchableOpacity>
//       </View>

//       {/* Submit */}
//       <TouchableOpacity
//         disabled={!isValid || loading || uploading}
//         onPress={handleSignup}
//         style={[
//           styles.submitButton,
//           (!isValid || loading || uploading) && styles.submitButtonDisabled,
//         ]}
//       >
//         {loading ? (
//           <ActivityIndicator color="#FFFFFF" />
//         ) : (
//           <Text style={styles.submitButtonText}>Create Account</Text>
//         )}
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPress={() => router.replace("/(auth)/login")}
//         style={styles.loginLink}
//       >
//         <Text style={styles.loginLinkText}>
//           Already have an account?{" "}
//           <Text style={styles.loginLinkBold}>Log in</Text>
//         </Text>
//       </TouchableOpacity>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#FFFFFF",
//     paddingHorizontal: 24,
//     justifyContent: "center",
//   },

//   title: {
//     fontSize: 28,
//     fontWeight: "700",
//     color: "#0F172A",
//     marginBottom: 4,
//     alignSelf: "center",
//   },

//   subtitle: {
//     fontSize: 14,
//     color: "#64748B",
//     marginBottom: 28,
//     alignSelf: "center",
//   },

//   // Avatar
//   avatarWrapper: {
//     alignSelf: "center",
//     alignItems: "center",
//     marginBottom: 24,
//   },

//   avatarContainer: {
//     position: "relative",
//     width: 100,
//     height: 100,
//   },

//   avatar: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     backgroundColor: "#F1F5F9",
//   },

//   avatarOverlay: {
//     position: "absolute",
//     bottom: 0,
//     right: 0,
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: "#2563EB",
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 2,
//     borderColor: "#FFFFFF",
//   },

//   editText: {
//     fontSize: 12,
//     color: "#2563EB",
//     marginTop: 8,
//     fontWeight: "500",
//   },

//   // Form
//   label: {
//     fontSize: 14,
//     fontWeight: "500",
//     color: "#0F172A",
//     marginBottom: 6,
//     marginTop: 16,
//     marginLeft: 4,
//   },

//   input: {
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     fontSize: 16,
//     backgroundColor: "#F8FAFC",
//     color: "#0F172A",
//   },

//   genderRow: {
//     flexDirection: "row",
//     gap: 12,
//     marginTop: 6,
//   },

//   genderButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     backgroundColor: "#FFFFFF",
//     alignItems: "center",
//   },

//   genderButtonActive: {
//     borderColor: "#2563EB",
//     backgroundColor: "#EFF6FF",
//   },

//   genderText: {
//     color: "#334155",
//     fontWeight: "500",
//     fontSize: 15,
//   },

//   genderTextActive: {
//     color: "#2563EB",
//   },

//   passwordWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     borderRadius: 12,
//     backgroundColor: "#F8FAFC",
//     paddingHorizontal: 14,
//   },

//   passwordInput: {
//     flex: 1,
//     paddingVertical: 12,
//     fontSize: 16,
//     color: "#0F172A",
//   },

//   eyeButton: {
//     padding: 4,
//   },

//   submitButton: {
//     backgroundColor: "#2563EB",
//     height: 52,
//     borderRadius: 16,
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 32,
//     shadowColor: "#2563EB",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },

//   submitButtonDisabled: {
//     backgroundColor: "#CBD5E1",
//     shadowOpacity: 0,
//     elevation: 0,
//   },

//   submitButtonText: {
//     color: "#FFFFFF",
//     fontWeight: "700",
//     fontSize: 16,
//   },

//   loginLink: {
//     alignSelf: "center",
//     marginTop: 20,
//   },

//   loginLinkText: {
//     fontSize: 14,
//     color: "#64748B",
//   },

//   loginLinkBold: {
//     color: "#2563EB",
//     fontWeight: "600",
//   },
// });

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import BASE_URL from "@/src/config/api";

const defaultAvatar = require("../../assets/uniTalk.png");

export default function SignupScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [localImageUri, setLocalImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValid =
    name.trim().length >= 2 &&
    (gender === "Male" || gender === "Female") &&
    password.length >= 6;

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setLocalImageUri(asset.uri);
      setUploading(true);

      const base64Image = `data:image/jpeg;base64,${asset.base64}`;

      const res = await fetch(`${BASE_URL}/api/auth/upload-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Upload failed", data.message || "Could not upload image");
        setLocalImageUri("");
        return;
      }

      setProfilePicUrl(data.url);
    } catch {
      Alert.alert("Error", "Failed to pick or upload image");
    } finally {
      setUploading(false);
    }
  };

 const handleSignup = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/auth/complete-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim(),
          gender,
          password,
          profilePic: profilePicUrl,
        }),
      });

      const data = await res.json();

     if (!res.ok) {
  Alert.alert("Error", data.message || "Signup failed");
  return;
}

router.replace("/(auth)/login");

    } catch {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>{email}</Text>

        {/* Avatar picker */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={pickImage}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={localImageUri ? { uri: localImageUri } : defaultAvatar}
              style={styles.avatar}
            />
            <View style={styles.avatarOverlay}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </View>
          </View>
          <Text style={styles.editText}>
            {uploading ? "Uploading..." : localImageUri ? "Change Photo" : "Add Photo"}
          </Text>
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#94A3B8"
        />

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {["Male", "Female"].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setGender(item)}
              style={[styles.genderButton, gender === item && styles.genderButtonActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item === "Male" ? "male-outline" : "female-outline"}
                size={16}
                color={gender === item ? "#2563EB" : "#94A3B8"}
              />
              <Text style={[styles.genderText, gender === item && styles.genderTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
            placeholder="Min. 6 characters"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          disabled={!isValid || loading || uploading}
          onPress={handleSignup}
          activeOpacity={0.85}
          style={[
            styles.submitButton,
            (!isValid || loading || uploading) && styles.submitButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{" "}
            <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    alignSelf: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 28,
    alignSelf: "center",
    fontWeight: "500",
  },

  // Avatar
  avatarWrapper: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 28,
  },

  avatarContainer: {
    position: "relative",
    width: 96,
    height: 96,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
  },

  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  editText: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 8,
    fontWeight: "500",
  },

  // Form
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },

  genderRow: {
    flexDirection: "row",
    gap: 12,
  },

  genderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  genderButtonActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  genderText: {
    color: "#94A3B8",
    fontWeight: "500",
    fontSize: 15,
  },

  genderTextActive: {
    color: "#2563EB",
  },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },

  eyeButton: {
    padding: 4,
  },

  submitButton: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  submitButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },

  loginLink: {
    alignSelf: "center",
    marginTop: 20,
  },

  loginLinkText: {
    fontSize: 14,
    color: "#64748B",
  },

  loginLinkBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
});