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

      // Fetch dishes from Supabase
      const { data, error } = await supabase
        .from("genai")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDishes(data || []);

      // Calculate total savings
      if (data) {
        const savings = data.reduce((total, dish) => {
          return total + (dish.resturantPrice - dish.estimatedHomeCookedPrice);
        }, 0);
        setTotalSaved(savings);
      }
    } catch (err) {
      console.error("Error fetching dishes:", err);
      setError("Failed to load dish history");
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

  // Function to render recipe ingredient based on type
  const renderIngredient = (
    ingredient: string | RecipeIngredient,
    index: number
  ) => {
    if (typeof ingredient === "string") {
      return (
        <Text key={index} className="text-sm ml-2 mb-0.5 text-gray-600">
          • {ingredient}
        </Text>
      );
    } else {
      return (
        <Text key={index} className="text-sm ml-2 mb-0.5 text-gray-600">
          • {ingredient.type}: {ingredient.amount}
          {ingredient.pricePerGram ? ` ($${ingredient.pricePerGram}/g)` : ""}
        </Text>
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      <View className="items-center mb-5">
        <Text className="text-2xl font-bold my-4">My Dish History</Text>

        {!loading && !error && dishes.length > 0 && (
          <View className="w-full bg-white rounded-xl p-4 mb-4 shadow">
            <View className="flex-row justify-between items-center">
              <View className="items-center p-3 bg-blue-50 rounded-lg">
                <Text className="text-sm text-blue-600 font-medium">
                  Total Dishes
                </Text>
                <Text className="text-2xl font-bold text-blue-800">
                  {dishes.length}
                </Text>
              </View>

              <View className="items-center p-3 bg-green-50 rounded-lg">
                <Text className="text-sm text-green-600 font-medium">
                  Total Saved
                </Text>
                <Text className="text-2xl font-bold text-green-800">
                  ${totalSaved.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" className="mt-10" />
      ) : error ? (
        <Text className="text-red-500 text-center mt-10 text-base">
          {error}
        </Text>
      ) : dishes.length === 0 ? (
        <Text className="text-center mt-10 text-base text-gray-600">
          No dishes in your history yet
        </Text>
      ) : (
        dishes.map((dish) => (
          <View
            key={dish.id}
            className="bg-white rounded-xl mb-4 overflow-hidden shadow"
          >
            <TouchableOpacity
              className="flex-row p-3"
              onPress={() => toggleExpand(dish.id)}
            >
              <Image
                source={{ uri: dish.image }}
                className="w-20 h-20 rounded-lg mr-3"
                defaultSource={{
                  uri: "https://ehysqseqcnewyndigvfo.supabase.co/storage/v1/object/public/food/public/upload-1742691964632.jpg",
                }}
              />
              <View className="flex-1 justify-center">
                <Text className="text-lg font-bold mb-1">{dish.meal}</Text>
                <Text className="text-sm text-gray-600 mb-1">
                  {new Date(dish.created_at).toLocaleDateString()}
                </Text>
                <Text className="text-sm font-medium text-green-600">
                  Home Cooked: ${dish.estimatedHomeCookedPrice}
                </Text>
                <Text className="text-sm font-medium text-red-500">
                  Restaurant: ${dish.resturantPrice}
                </Text>
              </View>
              {expandedDish !== dish.id && (
                <View className="justify-center">
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </View>
              )}
            </TouchableOpacity>

            {expandedDish === dish.id && (
              <View className="p-4 border-t border-gray-200">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-base font-bold">Recipe</Text>
                  <TouchableOpacity
                    onPress={closeExpanded}
                    className="p-1 bg-gray-100 rounded-full"
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {dish.recipe &&
                  dish.recipe.map((ingredient, index) =>
                    renderIngredient(ingredient, index)
                  )}

                <Text className="text-base font-bold mt-4 mb-1">
                  {dish.homeCooked ? "Home Cooked ✓" : "Restaurant Meal"}
                </Text>
                <Text className="text-sm bg-green-50 p-2 rounded-md mt-2">
                  Savings: $
                  {dish.resturantPrice - dish.estimatedHomeCookedPrice}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default Profile;
