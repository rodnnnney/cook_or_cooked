import supabase from "@/utils/supabase";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Text, ScrollView, TouchableOpacity } from "react-native";
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
  createdAt?: string; // Add date information
};

// Define time period options
type TimePeriod = 'week' | 'month' | 'year' | 'all';

const ChartKitDemo = () => {
  // State for storing meal data
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('month');
  const [selectedDataPoint, setSelectedDataPoint] = useState<{
    value: number;
    label: string;
    index: number;
    dataset?: number;
  } | null>(null);

  // Fetch meal data from Supabase with date information
  useEffect(() => {
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
        const transformedData = (data || []).map(item => ({
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

    fetchMeals();
  }, []);

  // Filter meals based on selected time period
  const getFilteredMeals = () => {
    if (!meals.length) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (selectedTimePeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        return meals;
    }
    
    return meals.filter(meal => {
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
        label: data.dataset?.data ? data.dataset.data[data.index] : 'Unknown',
        index: data.index,
        dataset: data.datasetIndex
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
    let groupedData: {[key: string]: Meal[]} = {};
    let dateFormat: string;
    
    switch (selectedTimePeriod) {
      case 'week':
        dateFormat = 'MM/DD'; // Day format
        filteredMeals.forEach(meal => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const key = `${date.getMonth()+1}/${date.getDate()}`;
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
      case 'month':
        dateFormat = 'Week W'; // Week format
        filteredMeals.forEach(meal => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(((date.getTime() - firstDayOfYear.getTime()) / 86400000 + firstDayOfYear.getDay() + 1) / 7);
          const key = `Week ${weekNumber}`;
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
      case 'year':
      case 'all':
        dateFormat = 'MMM'; // Month format
        filteredMeals.forEach(meal => {
          if (!meal.createdAt) return;
          const date = new Date(meal.createdAt);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const key = monthNames[date.getMonth()];
          groupedData[key] = [...(groupedData[key] || []), meal];
        });
        break;
    }
    
    // Calculate averages and totals for each period
    const labels = Object.keys(groupedData);
    const restaurantData = labels.map(label => {
      const periodMeals = groupedData[label];
      const totalCost = periodMeals.reduce((sum, meal) => sum + meal.resturantPrice, 0);
      return totalCost;
    });
    
    const homeCookedData = labels.map(label => {
      const periodMeals = groupedData[label];
      const totalCost = periodMeals.reduce((sum, meal) => sum + meal.estimatedHomeCookedPrice, 0);
      return totalCost;
    });
    
    const savingsData = labels.map((label, index) => {
      return restaurantData[index] - homeCookedData[index];
    });
    
    return {
      labels,
      restaurantData,
      homeCookedData,
      savingsData
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
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // Purple for restaurant prices
          strokeWidth: 2,
        },
        {
          data: timeSeriesData.homeCookedData,
          color: (opacity = 1) => `rgba(66, 194, 244, ${opacity})`, // Blue for home cooked prices
          strokeWidth: 2,
        },
      ],
      legend: ["Restaurant Price", "Home Cooked Price"],
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
          color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`, // Green for savings
          strokeWidth: 3,
        },
      ],
      legend: ["Savings"],
    };
  };

  // Prepare data for the savings comparison pie chart
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

  // Chart configurations - updated for dark theme
  const chartConfig = {
    backgroundColor: "#0D0D0D",
    backgroundGradientFrom: "#0D0D0D",
    backgroundGradientTo: "#171717",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#0D0D0D",
    },
  };

  const lineChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(46, 213, 115, ${opacity})`,
    strokeWidth: 2,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "rgba(255, 255, 255, 0.07)",
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(72, 149, 239, ${opacity})`,
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

  return (
    <ScrollView style={styles.container}>
      {/* Time period filter buttons */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Time Period:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedTimePeriod === 'week' && styles.activeButton]} 
            onPress={() => setSelectedTimePeriod('week')}
          >
            <Text style={[styles.filterButtonText, selectedTimePeriod === 'week' && styles.activeButtonText]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedTimePeriod === 'month' && styles.activeButton]} 
            onPress={() => setSelectedTimePeriod('month')}
          >
            <Text style={[styles.filterButtonText, selectedTimePeriod === 'month' && styles.activeButtonText]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedTimePeriod === 'year' && styles.activeButton]} 
            onPress={() => setSelectedTimePeriod('year')}
          >
            <Text style={[styles.filterButtonText, selectedTimePeriod === 'year' && styles.activeButtonText]}>
              Year
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedTimePeriod === 'all' && styles.activeButton]} 
            onPress={() => setSelectedTimePeriod('all')}
          >
            <Text style={[styles.filterButtonText, selectedTimePeriod === 'all' && styles.activeButtonText]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Savings over time chart */}
      {savingsTimeSeriesData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Savings Over Time</Text>
          <LineChart
            data={savingsTimeSeriesData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...lineChartConfig,
              color: (opacity = 1) => `rgba(25, 224, 139, ${opacity})`,
            }}
            bezier
            style={styles.chart}
            yAxisSuffix="$"
            fromZero
            onDataPointClick={handleDataPointClick}
          />
          {selectedDataPoint && selectedDataPoint.dataset === 0 && (
            <View style={styles.dataPointInfo}>
              <Text style={styles.dataPointText}>
                Period: {savingsTimeSeriesData.labels[selectedDataPoint.index]}
              </Text>
              <Text style={styles.dataPointText}>
                Savings: ${selectedDataPoint.value.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Restaurant vs Home cooking comparison chart */}
      {priceComparisonData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Restaurant vs Home Cooking Prices</Text>
          <LineChart
            data={{
              ...priceComparisonData,
              datasets: [
                {
                  ...priceComparisonData.datasets[0],
                  color: (opacity = 1) => `rgba(247, 143, 30, ${opacity})`, // Orange for restaurant
                },
                {
                  ...priceComparisonData.datasets[1],
                  color: (opacity = 1) => `rgba(54, 155, 255, ${opacity})`, // Blue for home
                },
              ]
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={lineChartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix="$"
            fromZero
            onDataPointClick={handleDataPointClick}
          />
          <Text style={styles.legend}>
            <Text style={styles.orangeDot}>●</Text> Restaurant Price{"  "}
            <Text style={styles.blueDot}>●</Text> Home Cooked Price
          </Text>
          
          {selectedDataPoint && (
            <View style={styles.dataPointInfo}>
              <Text style={styles.dataPointText}>
                Period: {priceComparisonData.labels[selectedDataPoint.index]}
              </Text>
              <Text style={styles.dataPointText}>
                {selectedDataPoint.dataset === 0 ? 'Restaurant' : 'Home Cooked'} Cost: ${selectedDataPoint.value.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Overall savings pie chart */}
      {savingsData && (
        <View style={styles.chartContainer}>
          <Text style={styles.title}>Cost Savings Analysis</Text>
          <PieChart
            data={[
              {
                ...savingsData[0],
                color: "#369BFF", // Bright blue for home cost
                legendFontColor: "#CCCCCC", // Light gray for text
              },
              {
                ...savingsData[1],
                color: "#19E08B", // Bright green for savings
                legendFontColor: "#CCCCCC", // Light gray for text
              },
            ]}
            width={screenWidth - 40}
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
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D", // Darker background
    padding: 16,
  },
  chartContainer: {
    backgroundColor: "#171717", // Slightly lighter dark background for contrast
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#FFFFFF", // Pure white for titles
  },
  chart: {
    borderRadius: 16,
    marginVertical: 12,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
    color: "#CCCCCC", // Light text for dark background
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
    color: "#FF5C5C", // Softer red for errors
  },
  legend: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    color: "#CCCCCC", // Light text
  },
  orangeDot: {
    color: "rgba(247, 143, 30, 1)",
    fontSize: 18,
  },
  blueDot: {
    color: "rgba(54, 155, 255, 1)",
    fontSize: 18,
  },
  filterContainer: {
    flexDirection: 'column',
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#171717', // Dark background
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#FFFFFF', // White text
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: '#232323', // Dark button background
    minWidth: 70,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#19E08B', // Bright green for active button
  },
  filterButtonText: {
    fontSize: 14,
    color: '#999999', // Gray for inactive text
  },
  activeButtonText: {
    color: '#0D0D0D', // Black text on green button for contrast
    fontWeight: 'bold',
  },
  dataPointInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)', // Very subtle light background
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dataPointText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#CCCCCC', // Light text
  },
});

export default ChartKitDemo;
