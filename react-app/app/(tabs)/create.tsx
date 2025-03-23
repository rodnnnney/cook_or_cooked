import { useState } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import supabase from "@/utils/supabase";
import {
  analyzeImage,
  processUploadedFoodImage,
  FoodCardData,
} from "@/utils/groq";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import FoodSavingsCard from "@/components/FoodSavingsCard";

const Create = () => {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [foodCardData, setFoodCardData] = useState<FoodCardData | null>(null);

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
      // Create a unique file name
      const fileExt = image.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `upload-${Date.now()}.${fileExt}`;
      const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";

      console.log("Starting upload for image:", image);

      // Read the file as base64
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
        // Start analyzing the image
        setUploading(false);
        setAnalyzing(true);
        console.log("Attempting to analyze image with OpenAI GPT-4o...");

        // Verify the URL is valid and accessible
        console.log("Image URL for analysis:", publicUrl);

        try {
          // Test that the image URL is accessible
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
          // Continue anyway, as the error might be due to CORS, but OpenAI might still access it
          console.log(
            "Continuing with analysis despite URL verification error"
          );
        }

        // Use our processUploadedFoodImage function to get structured card data
        const cardData = await processUploadedFoodImage(publicUrl);
        console.log("Food card data:", JSON.stringify(cardData, null, 2));

        // Insert data using the correct column names from the schema
        const { data: insertData, error: insertError } = await supabase
          .from("genai")
          .insert({
            meal: cardData.title,
            image: publicUrl,
            estimatedHomeCookedPrice: cardData.homeCookedPrice,
            recipe: cardData.ingredients,
            homeCooked: true,
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Meal</Text>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00AA5B" />
              <Text style={styles.loadingText}>
                {uploading
                  ? "Uploading image..."
                  : "Analyzing your meal... This might take a minute."}
              </Text>
            </View>
          )}

          {foodCardData && (
            <View style={styles.analysisResultContainer}>
              <FoodSavingsCard cardData={foodCardData} />
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetAll}
              >
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});

export default Create;
