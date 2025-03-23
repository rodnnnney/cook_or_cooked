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
      <View style={styles.contentWrapper}>
        <Text style={styles.headerText}>
          Food Cost Analyzer
        </Text>

        {!foodCardData && (
          <>
            <View style={styles.imageContainer}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="image" size={80} color="#444444" />
                  <Text style={styles.placeholderText}>
                    No image selected
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={pickImage}
              >
                <FontAwesome name="photo" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={takePhoto}
              >
                <FontAwesome name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {image && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (uploading || analyzing) && styles.disabledButton
                ]}
                onPress={uploadImage}
                disabled={uploading || analyzing}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text style={styles.buttonText}>
                      Uploading...
                    </Text>
                  </>
                ) : analyzing ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text style={styles.buttonText}>
                      Analyzing food image...
                    </Text>
                  </>
                ) : (
                  <>
                    <FontAwesome name="cloud-upload" size={20} color="white" />
                    <Text style={styles.buttonText}>
                      Analyze Food
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {foodCardData && (
          <View style={styles.resultContainer}>
            <FoodSavingsCard cardData={foodCardData} />

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetAll}
            >
              <FontAwesome name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>
                Analyze Another Image
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: "#0D0D0D",
  },
  contentWrapper: {
    padding: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#FFFFFF",
  },
  imageContainer: {
    height: 300,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#171717",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#232323",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 8,
    color: "#777777",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#19E08B",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "#369BFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "rgba(25, 224, 139, 0.5)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  resultContainer: {
    marginBottom: 20,
  },
});

export default Create;
