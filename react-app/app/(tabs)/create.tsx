import React, { useState } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import supabase from "@/utils/supabase";

const Create = () => {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
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

    try {
      // Create a unique file name
      const fileExt = image.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `upload-${Date.now()}.${fileExt}`;

      // Create a FormData object
      const formData = new FormData();

      // Append the image as a file object
      formData.append("file", {
        uri: image,
        name: fileName,
        type: fileExt === "png" ? "image/png" : "image/jpeg",
      } as any); // Type assertion needed for React Native

      // Get Supabase storage endpoint
      const supabaseUrl = `${supabase.supabaseUrl}/storage/v1/object/food/public/${fileName}`;

      // Make a direct fetch to the Supabase API
      const response = await fetch(supabaseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabase.supabaseKey}`,
          "x-upsert": "true", // Enable upsert
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Upload failed with status: ${response.status}`
        );
      }

      Alert.alert("Success", "Image uploaded successfully!");
      setImage(null);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        error instanceof Error
          ? error.message
          : "An error occurred during upload"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 p-5 bg-white">
      <Text className="text-2xl font-bold mb-5 text-center">
        Create New Post
      </Text>

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
            uploading ? "bg-green-300" : ""
          }`}
          onPress={uploadImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <FontAwesome name="cloud-upload" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Upload Image</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Create;
