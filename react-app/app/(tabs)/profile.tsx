import supabase from "@/utils/supabase";
import { useState, useEffect } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RecipeIngredient {
  type: string;
  amount: number;
  pricePerGram?: number;
}

interface Dish {
  id: number;
  meal: string;
  image: string;
  estimatedHomeCookedPrice: number;
  recipe: (string | RecipeIngredient)[];
  homeCooked: boolean;
  resturantPrice: number;
  created_at: string;
}

const Profile = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [expandedDish, setExpandedDish] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("genai")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDishes(data || []);

      // Calculate total savings
      const total = (data || []).reduce(
        (acc, dish) => acc + (dish.resturantPrice - dish.estimatedHomeCookedPrice),
        0
      );
      setTotalSaved(total);
    } catch (err) {
      console.error("Error fetching dishes:", err);
      setError("Failed to load your dishes");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedDish(expandedDish === id ? null : id);
  };

  const closeExpanded = () => {
    setExpandedDish(null);
  };

  const renderIngredient = (
    ingredient: string | RecipeIngredient,
    index: number
  ) => {
    if (typeof ingredient === "string") {
      return (
        <Text key={`string-${index}`} style={styles.ingredientText}>
          {ingredient}
        </Text>
      );
    }

    return (
      <View key={`ingredient-${index}`} style={styles.ingredientItem}>
        <Text style={styles.ingredientName}>{ingredient.type}</Text>
        <Text style={styles.ingredientAmount}>
          {ingredient.amount.toFixed(0)}g
        </Text>
        {ingredient.pricePerGram && (
          <Text style={styles.ingredientPrice}>
            ${(ingredient.amount * ingredient.pricePerGram).toFixed(2)}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#19E08B" />
          <Text style={styles.loadingText}>Loading your dishes...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDishes}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Meals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalSaved.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Savings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dishes.length}</Text>
            <Text style={styles.statLabel}>Meals Tracked</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Meals</Text>

        {dishes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              You haven't added any meals yet.
            </Text>
          </View>
        ) : (
          dishes.map((dish) => (
            <Pressable
              key={dish.id}
              style={styles.dishCard}
              onPress={() => toggleExpand(dish.id)}
            >
              {dish.image ? (
                <Image
                  source={{ uri: dish.image }}
                  style={styles.dishImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.dishImagePlaceholder}>
                  <Ionicons name="restaurant" size={30} color="#555555" />
                </View>
              )}

              <View style={styles.dishInfo}>
                <Text style={styles.dishName}>{dish.meal}</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Restaurant</Text>
                    <Text style={styles.restaurantPrice}>
                      ${dish.resturantPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Home</Text>
                    <Text style={styles.homePrice}>
                      ${dish.estimatedHomeCookedPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Savings</Text>
                    <Text style={styles.savingsPrice}>
                      ${(dish.resturantPrice - dish.estimatedHomeCookedPrice).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {expandedDish === dish.id && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.ingredientsTitle}>Ingredients:</Text>
                    {dish.recipe && Array.isArray(dish.recipe) ? (
                      dish.recipe.map((ingredient, index) =>
                        renderIngredient(ingredient, index)
                      )
                    ) : (
                      <Text style={styles.ingredientText}>No ingredients information</Text>
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
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
  scrollContent: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#00AA5B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333333",
  },
  dishCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  dishImage: {
    width: "100%",
    height: 180,
  },
  dishImagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  dishInfo: {
    padding: 16,
  },
  dishName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceItem: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  restaurantPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EB5757",
  },
  homePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00AA5B",
  },
  savingsPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00AA5B",
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  ingredientName: {
    flex: 2,
    fontSize: 14,
    color: "#333333",
  },
  ingredientAmount: {
    flex: 1,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  ingredientPrice: {
    flex: 1,
    fontSize: 14,
    color: "#00AA5B",
    textAlign: "right",
    fontWeight: "500",
  },
  ingredientText: {
    fontSize: 14,
    color: "#666666",
    paddingVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E74C3C",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#00AA5B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
});

export default Profile;
