import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.priceComparisonContainer}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Restaurant</Text>
            <Text style={styles.restaurantPrice}>${restaurantPrice.toFixed(2)}</Text>
          </View>
          
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Home Cooked</Text>
            <Text style={styles.homeCookedPrice}>${homeCookedPrice.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsText}>
            You save ${savings.toFixed(2)} ({savingsPercentage.toFixed(1)}%)
          </Text>
          <Text style={styles.savingsSubtext}>
            Always cheaper to cook at home!
          </Text>
        </View>
        
        {/* Ingredients section */}
        <TouchableOpacity 
          style={styles.ingredientsHeader}
          onPress={toggleIngredients}
        >
          <Text style={styles.ingredientsTitle}>Ingredients</Text>
          <FontAwesome 
            name={showIngredients ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#666666" 
          />
        </TouchableOpacity>
        
        {showIngredients && ingredients && ingredients.length > 0 && (
          <View style={styles.ingredientsList}>
            <FlatList
              data={ingredients}
              scrollEnabled={false}
              keyExtractor={(item, index) => `ingredient-${index}`}
              renderItem={({ item }) => (
                <View style={styles.ingredientItem}>
                  <Text style={styles.ingredientName}>{item.type}</Text>
                  <Text style={styles.ingredientPrice}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333333',
  },
  priceComparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  restaurantPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EB5757', // Red for restaurant
  },
  homeCookedPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00AA5B', // Wealthsimple green for home cooked
  },
  savingsContainer: {
    backgroundColor: 'rgba(0, 170, 91, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00AA5B',
  },
  savingsSubtext: {
    fontSize: 14,
    color: '#00AA5B',
    marginTop: 4,
    opacity: 0.8,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  ingredientsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  ingredientName: {
    color: '#333333',
  },
  ingredientPrice: {
    color: '#666666',
  },
});

export default FoodSavingsCard; 