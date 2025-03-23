import { useState, useEffect } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import supabase from "@/utils/supabase";
import { FoodCardData, processUploadedFoodImage } from "@/utils/groq";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import FoodSavingsCard from "@/components/FoodSavingsCard";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

const Create = () => {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [foodCardData, setFoodCardData] = useState<FoodCardData | null>(null);
  const [isHomeCooked, setIsHomeCooked] = useState(false);
  const [fontsLoaded] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
    }
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // or a loading indicator
  }

  const pickImage = async () => {
    // Reset states
    setFoodCardData(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Reset states
    setFoodCardData(null);

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (cameraPermission.status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera permissions to make this work!"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!image) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    setUploading(true);
    setAnalyzing(false);

    try {
      const fileExt = image.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `upload-${Date.now()}.${fileExt}`;
      const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";

      console.log("Starting upload for image:", image);

      const base64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("File content length:", base64.length);

      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from("food")
        .upload(`public/${fileName}`, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      console.log("Upload response:", { data, error });
      if (error) throw error;

      const publicUrl = supabase.storage
        .from("food")
        .getPublicUrl(`public/${fileName}`).data.publicUrl;

      console.log("Image uploaded successfully. Public URL:", publicUrl);

      try {
        setUploading(false);
        setAnalyzing(true);
        console.log("Attempting to analyze image with OpenAI GPT-4o...");

        console.log("Image URL for analysis:", publicUrl);

        try {
          const response = await fetch(publicUrl, { method: "HEAD" });
          if (!response.ok) {
            console.error(
              "Image URL not accessible:",
              publicUrl,
              "Status:",
              response.status
            );
            throw new Error(`Image URL not accessible: ${response.statusText}`);
          }
          console.log("Image URL is accessible, status:", response.status);
        } catch (fetchError) {
          console.error("Error verifying image URL:", fetchError);
          console.log(
            "Continuing with analysis despite URL verification error"
          );
        }

        const cardData = await processUploadedFoodImage(publicUrl);
        console.log("Food card data:", JSON.stringify(cardData, null, 2));

        const { data: insertData, error: insertError } = await supabase
          .from("genai")
          .insert({
            meal: cardData.title,
            image: publicUrl,
            estimatedHomeCookedPrice: cardData.homeCookedPrice,
            recipe: cardData.ingredients,
            homeCooked: isHomeCooked,
            resturantPrice: cardData.restaurantPrice,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting data into genai table:", insertError);
          throw new Error(
            `Failed to save analysis data: ${insertError.message}`
          );
        }

        console.log("Analysis data saved to genai table:", insertData);

        // Set the card data to display it
        setFoodCardData(cardData);
        setAnalyzing(false);

        // Show success message
        Alert.alert(
          "Analysis Complete",
          `Successfully analyzed ${
            cardData.title
          }. You could save $${cardData.savings.toFixed(2)} by cooking at home!`
        );
      } catch (analysisError) {
        console.error("Analysis error:", analysisError);
        let errorMessage = "Image was uploaded but couldn't be analyzed.";

        if (analysisError instanceof Error) {
          errorMessage += " " + analysisError.message;
          console.error("Error details:", analysisError.stack);
        } else {
          console.error("Unknown error type:", typeof analysisError);
        }

        setAnalyzing(false);
        Alert.alert("Analysis Failed", errorMessage);
      }
    } catch (error) {
      console.error("Upload error:", error);
      let errorMessage = "An error occurred during upload";

      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error details:", error.stack);
      }

      setUploading(false);
      setAnalyzing(false);
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setImage(null);
    setFoodCardData(null);
  };

  return (
    <ScrollView className="flex-1 bg-[#F7F9FC]">
      <View className="pt-5 px-5 pb-2.5 bg-white border-b border-black/5">
        <Text className="text-2xl font-semibold text-[#333333]">Add Meal</Text>
      </View>

      {!image ? (
        <View style={styles.uploadContainer}>
          <View style={styles.placeholderContainer}>
            <FontAwesome name="image" size={60} color="#CCCCCC" />
            <Text style={styles.placeholderText}>
              Take or upload a photo of your meal
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <FontAwesome name="photo" size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Choose From Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <FontAwesome name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: image }} style={styles.imagePreview} />

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>
              {isHomeCooked ? "Home-cooked Meal" : "Restaurant Meal"}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#c4e8d4" }}
              thumbColor={isHomeCooked ? "#00AA5B" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() => setIsHomeCooked((prevState) => !prevState)}
              value={isHomeCooked}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => {
                setImage(null);
                setFoodCardData(null);
              }}
            >
              <FontAwesome name="trash" size={24} color="#E74C3C" />
            </TouchableOpacity>

            {!uploading && !analyzing && !foodCardData && (
              <TouchableOpacity
                style={[styles.circleButton, styles.analyzeButton]}
                onPress={uploadImage}
              >
                <FontAwesome name="check" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {(uploading || analyzing) && (
            <View className="absolute inset-0 bg-black/30 justify-center items-center z-50 left-0 right-0 top-0 bottom-0 h-full w-full">
              <View className="bg-white p-5 rounded-2xl shadow w-4/5 items-center justify-center">
                <ActivityIndicator size="large" color="#00AA5B" />
                <Text className="mt-3 text-base text-center text-[#666666]">
                  {uploading
                    ? "Uploading image..."
                    : "Analyzing your meal... This might take a minute."}
                </Text>
              </View>
            </View>
          )}

          {foodCardData && (
            <View style={styles.analysisResultContainer}>
              <FoodSavingsCard cardData={foodCardData} />
              <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
                <Text style={styles.resetButtonText}>Take Another Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
  },
  uploadContainer: {
    padding: 20,
    alignItems: "center",
  },
  placeholderContainer: {
    width: "100%",
    height: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
    color: "#666666",
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  uploadButton: {
    backgroundColor: "#00AA5B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  imagePreviewContainer: {
    padding: 20,
  },
  imagePreview: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyzeButton: {
    backgroundColor: "#00AA5B",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "80%",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
    color: "#666666",
  },
  analysisResultContainer: {
    marginTop: 20,
  },
  resetButton: {
    backgroundColor: "#F0F0F0",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
});

export default Create;
