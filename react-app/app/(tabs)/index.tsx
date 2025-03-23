import supabase from "@/utils/supabase";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Text, ScrollView } from "react-native";
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from "react-native-chart-kit";

// Get the screen dimensions
const screenWidth = Dimensions.get("window").width;

// Define types for our meal data
type Meal = {
  id: number;
  meal: string;
  estimatedHomeCookedPrice: number;
  resturantPrice: number;
  homeCooked: boolean;
};

const ChartKitDemo = () => {
  // State for storing meal data
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch meal data from Supabase
  useEffect(() => {
    async function fetchMeals() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("genai")
          .select(
            "id, meal, estimatedHomeCookedPrice, resturantPrice, homeCooked"
          )
          .order("id", { ascending: true });

        if (error) throw error;

        setMeals(data || []);
      } catch (err) {
        console.error("Error fetching meals:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMeals();
  }, []);

  // Prepare data for charts
  const preparePriceComparisonData = () => {
    if (meals.length === 0) return null;

    return {
      labels: meals.map((meal) => meal.meal.substring(0, 5) + "..."), // Truncate long meal names
      datasets: [
        {
          data: meals.map((meal) => meal.resturantPrice),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // Purple for restaurant prices
          strokeWidth: 2,
        },
        {
          data: meals.map((meal) => meal.estimatedHomeCookedPrice),
          color: (opacity = 1) => `rgba(66, 194, 244, ${opacity})`, // Blue for home cooked prices
          strokeWidth: 2,
        },
      ],
      legend: ["Restaurant Price", "Home Cooked Price"],
    };
  };

  const prepareSavingsComparisonData = () => {
    if (meals.length === 0) return null;

    // Calculate savings percentages for pie chart
    const totalRestaurantCost = meals.reduce(
      (sum, meal) => sum + meal.resturantPrice,
      0
    );
    const totalHomeCookedCost = meals.reduce(
      (sum, meal) => sum + meal.estimatedHomeCookedPrice,
      0
    );
    const savings = totalRestaurantCost - totalHomeCookedCost;

    return [
      {
        name: "Home Cost",
        population: totalHomeCookedCost,
        color: "#36A2EB",
        legendFontColor: "#7F7F7F",
        legendFontSize: 12,
      },
      {
        name: "Savings",
        population: savings,
        color: "#FFCE56",
        legendFontColor: "#7F7F7F",
        legendFontSize: 12,
      },
    ];
  };

  // Chart configurations
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726",
    },
  };

  const lineChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    strokeWidth: 2,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "rgba(0, 0, 0, 0.1)",
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(50, 100, 244, ${opacity})`,
    barPercentage: 0.8,
  };

  // Handle loading and error states
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading meal data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const priceComparisonData = preparePriceComparisonData();
  const savingsData = prepareSavingsComparisonData();

  return (
    <ScrollView style={styles.container}>
      {priceComparisonData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Restaurant vs Home Cooking Prices</Text>
          <LineChart
            data={priceComparisonData}
            width={screenWidth - 40}
            height={220}
            chartConfig={lineChartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix="$"
            yAxisInterval={1}
            fromZero
            verticalLabelRotation={0}
            horizontalLabelRotation={30}
            segments={5}
          />
          <Text style={styles.legend}>
            <Text style={styles.purpleDot}>●</Text> Restaurant Price{"  "}
            <Text style={styles.blueDot}>●</Text> Home Cooked Price
          </Text>
        </View>
      )}

      {savingsData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Cost Savings Analysis</Text>
          <PieChart
            data={savingsData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
            style={styles.chart}
          />
        </View>
      )}

      {meals.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Price Comparison by Meal</Text>
          <BarChart
            data={{
              labels: meals.map((meal) => meal.meal.substring(0, 5)),
              datasets: [
                {
                  data: meals.map((meal) => meal.resturantPrice),
                },
              ],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={barChartConfig}
            style={styles.chart}
            verticalLabelRotation={30}
            yAxisSuffix="$"
            yAxisLabel=""
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 10,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
    color: "red",
  },
  legend: {
    textAlign: "center",
    marginTop: 5,
    fontSize: 14,
  },
  purpleDot: {
    color: "rgba(134, 65, 244, 1)",
    fontSize: 20,
  },
  blueDot: {
    color: "rgba(66, 194, 244, 1)",
    fontSize: 20,
  },
});

export default ChartKitDemo;
