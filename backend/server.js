// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Helper function to analyze images (mock for now)
const analyzeImage = async (imagePath, isRestaurant, providedMeal = null) => {
  // This would call an LLM API in a real implementation
  // For now, return dummy data

  return {
    meal: providedMeal || "Chicken Fried Rice",
    estimatedHomeCookedPrice: 10.5,
    recipe: [
      { type: "rice", amount: "200g", pricePerGram: 0.005 },
      { type: "chicken", amount: "300g", pricePerGram: 0.02 },
      { type: "broccoli", amount: "100g", pricePerGram: 0.01 },
      { type: "carrot", amount: "50g", pricePerGram: 0.008 },
      { type: "onion", amount: "50g", pricePerGram: 0.006 },
      { type: "soy sauce", amount: "20ml", pricePerGram: 0.02 },
      { type: "vegetable oil", amount: "15ml", pricePerGram: 0.01 },
    ],
    mealPrice: 10.5,
    restaurantPrice: isRestaurant ? 18.95 : null,
    saving: isRestaurant ? 8.45 : 0,
  };
};

// API Routes

// 1. Upload and analyze a meal photo
app.post("/api/meal", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file?.path || "dummy/path.png";
    const isRestaurant = req.body.is_restaurant === "true";
    const providedMeal = req.body.meal || null;
    const restaurantPrice = req.body.restaurant_price
      ? parseFloat(req.body.restaurant_price)
      : null;

    // Analyze image to get meal details
    const mealAnalysis = await analyzeImage(
      imagePath,
      isRestaurant,
      providedMeal
    );

    // If restaurant price was provided, use it and calculate savings
    if (restaurantPrice && isRestaurant) {
      mealAnalysis.restaurantPrice = restaurantPrice;
      mealAnalysis.saving = restaurantPrice - mealAnalysis.mealPrice;
    }

    return res.status(200).json({
      meal: mealAnalysis.meal,
      image: req.file?.filename || "something.png",
      estimatedHomeCookedPrice: mealAnalysis.mealPrice,
      recipe: mealAnalysis.recipe,
      mealPrice: mealAnalysis.mealPrice,
      restaurantPrice: mealAnalysis.restaurantPrice,
      saving: mealAnalysis.saving,
    });
  } catch (error) {
    console.error("Error processing meal:", error);
    return res.status(500).json({ error: "Failed to process meal" });
  }
});

// 2. Save meal to database (dummy implementation)
app.post("/api/create/meal", async (req, res) => {
  try {
    const mealData = req.body;
    const guid = uuidv4();

    // Just return the data with a GUID as if it was saved
    const savedMeal = {
      ...mealData,
      guid,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json(savedMeal);
  } catch (error) {
    console.error("Error saving meal:", error);
    return res.status(500).json({ error: "Failed to save meal" });
  }
});

// 3. Get all saved meals with savings info
app.get("/api/savings", async (req, res) => {
  try {
    // Return dummy data
    const meals = [
      {
        meal: "Chicken Fried Rice",
        image: "something1.png",
        estimatedHomeCookedPrice: 10.5,
        recipe: [
          { type: "rice", amount: "200g", pricePerGram: 0.005 },
          { type: "chicken", amount: "300g", pricePerGram: 0.02 },
          { type: "vegetables", amount: "150g", pricePerGram: 0.01 },
        ],
        mealPrice: 10.5,
        restaurantPrice: 18.95,
        saving: 8.45,
        homeCooked: false,
        guid: "123e4567-e89b-12d3-a456-426614174000",
        createdAt: "2025-03-20T12:00:00Z",
      },
      {
        meal: "Beef Burger",
        image: "something2.png",
        estimatedHomeCookedPrice: 5.75,
        recipe: [
          { type: "beef", amount: "150g", pricePerGram: 0.025 },
          { type: "bun", amount: "1 piece", pricePerGram: 0.5 },
          { type: "lettuce", amount: "20g", pricePerGram: 0.008 },
          { type: "tomato", amount: "30g", pricePerGram: 0.01 },
        ],
        mealPrice: 5.75,
        restaurantPrice: 12.99,
        saving: 7.24,
        homeCooked: false,
        guid: "223e4567-e89b-12d3-a456-426614174001",
        createdAt: "2025-03-21T14:30:00Z",
      },
      {
        meal: "Spaghetti Bolognese",
        image: "something3.png",
        estimatedHomeCookedPrice: 8.25,
        recipe: [
          { type: "pasta", amount: "200g", pricePerGram: 0.008 },
          { type: "ground beef", amount: "200g", pricePerGram: 0.02 },
          { type: "tomato sauce", amount: "150g", pricePerGram: 0.01 },
          { type: "onion", amount: "50g", pricePerGram: 0.006 },
        ],
        mealPrice: 8.25,
        restaurantPrice: 14.5,
        saving: 6.25,
        homeCooked: true,
        guid: "323e4567-e89b-12d3-a456-426614174002",
        createdAt: "2025-03-22T10:15:00Z",
      },
    ];

    return res.status(200).json(meals);
  } catch (error) {
    console.error("Error fetching savings:", error);
    return res.status(500).json({ error: "Failed to fetch savings data" });
  }
});

// 4. Get history for graphing (dates and savings)
app.get("/api/history", async (req, res) => {
  try {
    // Return dummy data for history
    const history = [
      { date: "2025-03-15", totalSavings: 15.75, mealCount: 2 },
      { date: "2025-03-16", totalSavings: 0, mealCount: 0 },
      { date: "2025-03-17", totalSavings: 8.45, mealCount: 1 },
      { date: "2025-03-18", totalSavings: 12.5, mealCount: 2 },
      { date: "2025-03-19", totalSavings: 0, mealCount: 0 },
      { date: "2025-03-20", totalSavings: 8.45, mealCount: 1 },
      { date: "2025-03-21", totalSavings: 7.24, mealCount: 1 },
      { date: "2025-03-22", totalSavings: 6.25, mealCount: 1 },
    ];

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ error: "Failed to fetch history data" });
  }
});

// 5. Delete a meal from the database (dummy implementation)
app.delete("/api/meal/:guid", async (req, res) => {
  try {
    const { guid } = req.params;

    // Pretend to delete and return success
    return res.status(200).json({
      message: `Meal with ID ${guid} successfully deleted`,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return res.status(500).json({ error: "Failed to delete meal" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing
