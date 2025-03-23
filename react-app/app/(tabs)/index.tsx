import supabase from "@/utils/supabase";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";

// Get the screen dimensions
const screenWidth = Dimensions.get("window").width;

// Define types for our meal data
type Meal = {
  id: number;
  meal: string;
  estimatedHomeCookedPrice: number;
  resturantPrice: number;
  homeCooked: boolean;
  createdAt?: string; // Add date information
};

// Define time period options
type TimePeriod = "week" | "month" | "year" | "all";

const ChartKitDemo = () => {
  // State for storing meal data
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<TimePeriod>("month");
  const [selectedDataPoint, setSelectedDataPoint] = useState<{
    value: number;
    label: string;
    index: number;
    dataset?: number;
  } | null>(null);

  // Replace the useEffect with useFocusEffect to fetch data every time the page is focused
  useFocusEffect(
    useCallback(() => {
      fetchMeals();
      return () => {
        // Optional cleanup function
      };
    }, [])
  );

  // Move the fetchMeals function outside of useEffect
  async function fetchMeals() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("genai")
        .select(
          "id, meal, estimatedHomeCookedPrice, resturantPrice, homeCooked, created_at"
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform data to include createdAt as JavaScript date
      const transformedData = (data || []).map((item) => ({
        ...item,
        createdAt: item.created_at,
      }));

      setMeals(transformedData || []);
    } catch (err) {
      console.error("Error fetching meals:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  // Filter meals based on selected time period
  const getFilteredMeals = () => {
    if (!meals.length) return [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (selectedTimePeriod) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
      default:
        return meals;
    }

    return meals.filter((meal) => {
      if (!meal.createdAt) return true;
      const mealDate = new Date(meal.createdAt);
      return mealDate >= cutoffDate;
    });
  };

  // Handle chart touch events
  const handleDataPointClick = (data: any) => {
    if (data && data.index !== undefined) {
      setSelectedDataPoint({
        value: data.value,
        label: data.dataset?.data ? data.dataset.data[data.index] : "Unknown",
        index: data.index,
        dataset: data.datasetIndex,
      });
    } else {
      setSelectedDataPoint(null);
    }
  };

  // Group data by time periods for time-series display
  const aggregateDataByPeriod = () => {
    const filteredMeals = getFilteredMeals();

    if (filteredMeals.length === 0) return null;

    // Group meals by period (can be day, week, or month depending on the selected period)
    let groupedData: { [key: string]: Meal[] } = {};
    let dateFormat: string;

    switch (selectedTimePeriod) {
      case "week":
        dateFormat = "MM/DD"; // Day format
        filteredMeals.forEach((meal) => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const key = `${date.getMonth() + 1}/${date.getDate()}`;
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
      case "month":
        dateFormat = "Week W"; // Week format
        filteredMeals.forEach((meal) => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(
            ((date.getTime() - firstDayOfYear.getTime()) / 86400000 +
              firstDayOfYear.getDay() +
              1) /
              7
          );
          const key = `Week ${weekNumber}`;
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
      case "year":
      case "all":
        dateFormat = "MMM"; // Month format
        filteredMeals.forEach((meal) => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const key = monthNames[date.getMonth()];
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
    }

    // Calculate averages and totals for each period
    const labels = Object.keys(groupedData);
    const restaurantData = labels.map((label) => {
      const periodMeals = groupedData[label];
      const totalCost = periodMeals.reduce(
        (sum, meal) => sum + meal.resturantPrice,
        0
      );
      return totalCost;
    });

    const homeCookedData = labels.map((label) => {
      const periodMeals = groupedData[label];
      const totalCost = periodMeals.reduce(
        (sum, meal) => sum + meal.estimatedHomeCookedPrice,
        0
      );
      return totalCost;
    });

    const savingsData = labels.map((label, index) => {
      const periodMeals = groupedData[label];
      // Calculate actual savings based on meal choice (home cooked vs restaurant)
      const actualSavings = periodMeals.reduce((totalSavings, meal) => {
        if (meal.homeCooked) {
          // If meal was home cooked, we saved money
          return totalSavings + (meal.resturantPrice - meal.estimatedHomeCookedPrice);
        } else {
          // If meal was at restaurant, we didn't save this potential amount
          return totalSavings - (meal.resturantPrice - meal.estimatedHomeCookedPrice);
        }
      }, 0);
      
      return actualSavings;
    });

    return {
      labels,
      restaurantData,
      homeCookedData,
      savingsData,
    };
  };

  // Prepare data for the comparison line chart
  const preparePriceComparisonData = () => {
    const timeSeriesData = aggregateDataByPeriod();
    if (!timeSeriesData) return null;

    return {
      labels: timeSeriesData.labels,
      datasets: [
        {
          data: timeSeriesData.restaurantData,
          color: (opacity = 1) => `rgba(235, 87, 87, ${opacity})`, // Red for restaurant prices
          strokeWidth: 2,
        },
        {
          data: timeSeriesData.homeCookedData,
          color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`, // Wealthsimple green for home cooked prices
          strokeWidth: 2,
        },
      ],
    };
  };

  // Prepare data for the savings line chart
  const prepareSavingsTimeSeriesData = () => {
    const timeSeriesData = aggregateDataByPeriod();
    if (!timeSeriesData) return null;

    return {
      labels: timeSeriesData.labels,
      datasets: [
        {
          data: timeSeriesData.savingsData,
          color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`, // Wealthsimple green
          strokeWidth: 3,
        },
      ],
      legend: ["Savings"],
    };
  };

  // Prepare data for the savings comparison pie chart
  const prepareSavingsComparisonData = () => {
    if (meals.length === 0) return null;

    // Calculate total costs
    const totalRestaurantCost = meals.reduce(
      (sum, meal) => sum + meal.resturantPrice,
      0
    );
    const totalHomeCookedCost = meals.reduce(
      (sum, meal) => sum + meal.estimatedHomeCookedPrice,
      0
    );
    
    // Calculate actual savings based on choices made
    const actualSavings = meals.reduce((totalSavings, meal) => {
      if (meal.homeCooked) {
        // If meal was home cooked, we saved money
        return totalSavings + (meal.resturantPrice - meal.estimatedHomeCookedPrice);
      } else {
        // If meal was at restaurant, we didn't save this potential amount (this is negative)
        return totalSavings - (meal.resturantPrice - meal.estimatedHomeCookedPrice);
      }
    }, 0);
    
    // Calculate potential savings (if all meals were home cooked)
    const potentialSavings = totalRestaurantCost - totalHomeCookedCost;
    
    // For the pie chart, we want to show how much was actually saved vs potential savings lost
    const savedAmount = Math.max(0, actualSavings); // Actual savings (positive value only)
    const lostSavings = Math.max(0, potentialSavings - savedAmount); // Potential savings not realized
    
    return [
      {
        name: "Home Cost",
        population: totalHomeCookedCost,
        color: "#A0A5B1", // Gray for home cost
        legendFontColor: "#555555",
        legendFontSize: 12,
      },
      {
        name: "Saved",
        population: savedAmount,
        color: "#00AA5B", // Green for actual savings
        legendFontColor: "#555555",
        legendFontSize: 12,
      },
      {
        name: "Lost Potential Savings",
        population: lostSavings,
        color: "#EB5757", // Red for lost savings
        legendFontColor: "#555555",
        legendFontSize: 12,
      },
    ];
  };

  // Chart configurations - updated for Wealthsimple-like light theme
  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#F7F9FC",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 36, 38, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(33, 36, 38, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#FFFFFF",
    },
  };

  const lineChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`,
    strokeWidth: 2,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "rgba(33, 36, 38, 0.07)",
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`,
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
  const savingsTimeSeriesData = prepareSavingsTimeSeriesData();

  const calculateTotalActualSavings = () => {
    const timeSeriesData = aggregateDataByPeriod();
    if (!timeSeriesData) return 0;

    return timeSeriesData.savingsData.reduce((total, savings) => total + savings, 0);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Time period filter buttons */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meal Savings</Text>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Time Period</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedTimePeriod === "week" && styles.activeButton,
            ]}
            onPress={() => setSelectedTimePeriod("week")}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedTimePeriod === "week" && styles.activeButtonText,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedTimePeriod === "month" && styles.activeButton,
            ]}
            onPress={() => setSelectedTimePeriod("month")}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedTimePeriod === "month" && styles.activeButtonText,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedTimePeriod === "year" && styles.activeButton,
            ]}
            onPress={() => setSelectedTimePeriod("year")}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedTimePeriod === "year" && styles.activeButtonText,
              ]}
            >
              Year
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedTimePeriod === "all" && styles.activeButton,
            ]}
            onPress={() => setSelectedTimePeriod("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedTimePeriod === "all" && styles.activeButtonText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall savings summary */}
      {savingsData && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryValue}>
            ${calculateTotalActualSavings().toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Actual Savings</Text>
        </View>
      )}

      {/* Savings over time chart */}
      {savingsTimeSeriesData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Savings Over Time</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={savingsTimeSeriesData}
              width={screenWidth - 50}
              height={220}
              chartConfig={{
                ...lineChartConfig,
                color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#FFFFFF",
                },
              }}
              bezier
              style={styles.chart}
              yAxisSuffix="$"
              fromZero
              onDataPointClick={handleDataPointClick}
            />
          </View>
          {selectedDataPoint && selectedDataPoint.dataset === 0 && (
            <View style={styles.dataPointInfo}>
              <Text style={styles.dataPointText}>
                Period: {savingsTimeSeriesData.labels[selectedDataPoint.index]}
              </Text>
              <Text style={styles.dataPointValue}>
                ${selectedDataPoint.value.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {priceComparisonData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Restaurant vs Home Cooking</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={{
                ...priceComparisonData,
                datasets: [
                  {
                    ...priceComparisonData.datasets[0],
                    color: (opacity = 1) => `rgba(235, 87, 87, ${opacity})`, // Red for restaurant
                  },
                  {
                    ...priceComparisonData.datasets[1],
                    color: (opacity = 1) => `rgba(0, 170, 91, ${opacity})`, // Wealthsimple green for home
                  },
                ],
              }}
              width={screenWidth - 50}
              height={220}
              chartConfig={{
                ...lineChartConfig,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#FFFFFF",
                },
              }}
              bezier
              style={styles.chart}
              yAxisSuffix="$"
              fromZero
              onDataPointClick={handleDataPointClick}
            />
          </View>

          {selectedDataPoint && (
            <View style={styles.dataPointInfo}>
              <Text style={styles.dataPointText}>
                {priceComparisonData.labels[selectedDataPoint.index]}
              </Text>
              <Text style={styles.dataPointValue}>
                ${selectedDataPoint.value.toFixed(2)}
              </Text>

              {(() => {
                const restaurantValue =
                  priceComparisonData.datasets[0].data[selectedDataPoint.index];
                if (selectedDataPoint.value > restaurantValue) {
                  return (
                    <Text
                      style={[styles.dataPointSubtext, { color: "#EB5757" }]}
                    >
                      Restaurant Cooked
                    </Text>
                  );
                } else if (selectedDataPoint.value < restaurantValue) {
                  return (
                    <Text
                      style={[styles.dataPointSubtext, { color: "#00AA5B" }]}
                    >
                      Home Cooked
                    </Text>
                  );
                }
              })()}
            </View>
          )}
        </View>
      )}

      {savingsData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Cost Breakdown</Text>
          <View style={styles.chartWrapper}>
            <PieChart
              data={savingsData}
              width={screenWidth - 50}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
              style={styles.chart}
              hasLegend={true}
            />
          </View>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A0A5B1' }]} />
              <Text style={styles.legendText}>Home Cost</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00AA5B' }]} />
              <Text style={styles.legendText}>Saved</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EB5757' }]} />
              <Text style={styles.legendText}>Lost Savings</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC", // Light background similar to Wealthsimple
    padding: 0,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF", // White background for cards
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden", // Ensures content doesn't overflow
  },
  chartWrapper: {
    alignItems: "center", // Center the chart
    marginHorizontal: -5, // Adjust margins to prevent overflow
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginVertical: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#00AA5B", // Wealthsimple green
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333333",
  },
  chart: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
    color: "#666666",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
    color: "#E74C3C",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#666666",
  },
  filterContainer: {
    marginVertical: 12,
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333333",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    minWidth: 70,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#00AA5B", // Wealthsimple green
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  activeButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  dataPointInfo: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 170, 91, 0.3)",
    alignItems: "center",
  },
  dataPointText: {
    fontSize: 14,
    color: "#666666",
  },
  dataPointValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#00AA5B",
    marginVertical: 6,
  },
  dataPointSubtext: {
    fontSize: 13,
    color: "#666666",
  },
});

export default ChartKitDemo;
