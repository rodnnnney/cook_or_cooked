import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { FoodCardData } from '../utils/groq';
import { FontAwesome } from "@expo/vector-icons";

interface FoodSavingsCardProps {
  cardData: FoodCardData;
  onPress?: () => void;
}

const FoodSavingsCard: React.FC<FoodSavingsCardProps> = ({ cardData, onPress }) => {
  const [showIngredients, setShowIngredients] = useState(false);
  
  const { 
    title, 
    homeCookedPrice, 
    restaurantPrice, 
    savings, 
    savingsPercentage, 
    imageUrl,
    ingredients
  } = cardData;

  const toggleIngredients = () => {
    setShowIngredients(!showIngredients);
  };

  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-4">
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: imageUrl }} 
          className="w-full h-48 bg-gray-200"
          resizeMode="cover"
        />
      </TouchableOpacity>
      
      <View className="p-4">
        <Text className="text-xl font-bold mb-3">{title}</Text>
        
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-gray-500 text-sm mb-1">Restaurant</Text>
            <Text className="text-lg font-semibold">${restaurantPrice.toFixed(2)}</Text>
          </View>
          
          <View className="items-center">
            <Text className="text-gray-500 text-sm mb-1">Home Cooked</Text>
            <Text className="text-lg font-semibold">${homeCookedPrice.toFixed(2)}</Text>
          </View>
        </View>
        
        <View className="bg-green-100 p-3 rounded-lg items-center mb-3">
          <Text className="text-green-800 font-semibold text-base">
            You save ${savings.toFixed(2)} ({savingsPercentage.toFixed(1)}%)
          </Text>
          <Text className="text-green-700 text-sm mt-1">
            Always cheaper to cook at home!
          </Text>
        </View>
        
        {/* Ingredients section */}
        <TouchableOpacity 
          className="flex-row items-center justify-between border-t border-gray-200 pt-3"
          onPress={toggleIngredients}
        >
          <Text className="font-semibold text-gray-700">Ingredients</Text>
          <FontAwesome 
            name={showIngredients ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {showIngredients && ingredients && ingredients.length > 0 && (
          <View className="mt-2 border-t border-gray-100 pt-2">
            <FlatList
              data={ingredients}
              scrollEnabled={false}
              keyExtractor={(item, index) => `ingredient-${index}`}
              renderItem={({ item }) => (
                <View className="flex-row justify-between py-1">
                  <Text className="text-gray-700">{item.type}</Text>
                  <Text className="text-gray-500">
                    {item.amount.toFixed(0)}g × ${item.pricePerGram.toFixed(3)}/g
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default FoodSavingsCard; 