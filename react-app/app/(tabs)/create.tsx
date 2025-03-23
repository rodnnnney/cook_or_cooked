import React, { useState } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import supabase from "@/utils/supabase";
import { analyzeImage, processUploadedFoodImage, FoodCardData } from "@/utils/groq";
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

      // Convert base64 to ArrayBuffer using the decode function from base64-arraybuffer
      const arrayBuffer = decode(base64);

      // Upload to Supabase using ArrayBuffer
      const { data, error } = await supabase.storage
        .from("food")
        .upload(`public/${fileName}`, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      console.log("Upload response:", { data, error });
      if (error) throw error;

      // Get the public URL
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
          const response = await fetch(publicUrl, { method: 'HEAD' });
          if (!response.ok) {
            console.error("Image URL not accessible:", publicUrl, "Status:", response.status);
            throw new Error(`Image URL not accessible: ${response.statusText}`);
          }
          console.log("Image URL is accessible, status:", response.status);
        } catch (fetchError) {
          console.error("Error verifying image URL:", fetchError);
          // Continue anyway, as the error might be due to CORS, but OpenAI might still access it
          console.log("Continuing with analysis despite URL verification error");
        }
        
        // Use our processUploadedFoodImage function to get structured card data
        const cardData = await processUploadedFoodImage(publicUrl);
        console.log("Food card data:", JSON.stringify(cardData, null, 2));
        
        // Set the card data to display it
        setFoodCardData(cardData);
        setAnalyzing(false);
        
        // Show success message
        Alert.alert(
          "Analysis Complete",
          `Successfully analyzed ${cardData.title}. You could save $${cardData.savings.toFixed(2)} by cooking at home!`
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
        Alert.alert(
          "Analysis Failed",
          errorMessage
        );
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
    <ScrollView className="flex-1 bg-white">
      <View className="p-5">
        <Text className="text-2xl font-bold mb-5 text-center">
          Food Cost Analyzer
        </Text>

        {!foodCardData && (
          <>
            <View className="h-[300px] w-full rounded-xl overflow-hidden bg-gray-100 mb-5 justify-center items-center border border-gray-200">
              {image ? (
                <Image source={{ uri: image }} className="w-full h-full" />
              ) : (
                <View className="items-center justify-center">
                  <FontAwesome name="image" size={80} color="#cccccc" />
                  <Text className="mt-2 text-gray-500 text-base">
                    No image selected
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-around mb-5">
              <TouchableOpacity
                className="bg-blue-500 py-3 px-6 rounded-lg flex-row items-center justify-center"
                onPress={pickImage}
              >
                <FontAwesome name="photo" size={20} color="white" />
                <Text className="text-white font-bold ml-2">Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-500 py-3 px-6 rounded-lg flex-row items-center justify-center"
                onPress={takePhoto}
              >
                <FontAwesome name="camera" size={20} color="white" />
                <Text className="text-white font-bold ml-2">Camera</Text>
              </TouchableOpacity>
            </View>

            {image && (
              <TouchableOpacity
                className={`bg-green-500 py-4 rounded-lg flex-row items-center justify-center ${
                  uploading || analyzing ? "bg-green-300" : ""
                }`}
                onPress={uploadImage}
                disabled={uploading || analyzing}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text className="text-white font-bold ml-2">Uploading...</Text>
                  </>
                ) : analyzing ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text className="text-white font-bold ml-2">Analyzing food image...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome name="cloud-upload" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Analyze Food</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {foodCardData && (
          <View className="mb-5">
            <FoodSavingsCard cardData={foodCardData} />
            
            <TouchableOpacity
              className="bg-blue-500 py-4 rounded-lg flex-row items-center justify-center mt-5"
              onPress={resetAll}
            >
              <FontAwesome name="refresh" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Analyze Another Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default Create;
