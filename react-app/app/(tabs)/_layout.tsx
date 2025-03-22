import { Tabs } from "expo-router";
import React from "react";
import { FontAwesome } from "@expo/vector-icons";
import { View, TouchableOpacity } from "react-native";

const _Layout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="search" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          headerShown: false,
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: "#007AFF",
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <FontAwesome name="plus" size={24} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="bookmark" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default _Layout;
