import React from "react";
import { View, StyleSheet, Dimensions, Text, ScrollView } from "react-native";
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from "react-native-chart-kit";

// Get the screen dimensions
const screenWidth = Dimensions.get("window").width;

// Example data - replace with your actual data
const lineData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      data: [30, 45, 28, 35, 50, 42],
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // Purple line
      strokeWidth: 2,
    },
    {
      data: [20, 30, 40, 25, 45, 38],
      color: (opacity = 1) => `rgba(66, 194, 244, ${opacity})`, // Blue line
      strokeWidth: 2,
    },
  ],
  legend: ["Dataset 1", "Dataset 2"],
};

const barData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      data: [30, 45, 28, 35, 50, 42],
    },
  ],
};

const pieData = [
  {
    name: "Product A",
    population: 35,
    color: "#FF6384",
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  },
  {
    name: "Product B",
    population: 25,
    color: "#36A2EB",
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  },
  {
    name: "Product C",
    population: 40,
    color: "#FFCE56",
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  },
];

const progressData = {
  labels: ["Task 1", "Task 2", "Task 3"], // optional
  data: [0.65, 0.8, 0.4],
};

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

const ChartKitDemo = () => {
  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Text style={styles.title}>Line Chart</Text>
        <LineChart
          data={lineData}
          width={screenWidth - 40}
          height={220}
          chartConfig={lineChartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix=""
          yAxisInterval={1}
          fromZero
          verticalLabelRotation={0}
          horizontalLabelRotation={0}
          segments={5}
          legend={lineData.legend}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.title}>Pie Chart</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </View>
    </View>
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
});

export default ChartKitDemo;
