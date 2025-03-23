import { Groq } from "groq-sdk";
import OpenAI from "openai";
import { ingredientPrices } from "./ingredientPrices";

// React Native environment variables are accessed via process.env.EXPO_PUBLIC_*
// Make sure your .env file has EXPO_PUBLIC_OPENAI_API_KEY defined
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Ensure the API key is available
if (!OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API key not found in environment variables. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file."
  );
}

// Initialize OpenAI client with the provided API key
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

console.log("OpenAI API Key status: Found in environment variables");

// Simple in-memory cache to store previous analysis results by image URL
const analysisCache: Record<string, MealAnalysis> = {};

// Add proper TypeScript interfaces for the return type
interface RecipeIngredient {
  type: string;
  amount: number;
  pricePerGram: number;
}

interface MealAnalysis {
  meal: string;
  recipe: RecipeIngredient[];
  estimatedHomeCookedPrice: number;
  restaurantPrice: number;
  saving: number;
}

// Interface for card display data
export interface FoodCardData {
  title: string;
  homeCookedPrice: number;
  restaurantPrice: number;
  savings: number;
  savingsPercentage: number;
  ingredients: RecipeIngredient[];
  imageUrl: string;
}

/**
 * Normalizes a price to ensure consistency
 * @param price The price to normalize
 * @param digits Number of decimal digits to round to (default: 2)
 * @returns Normalized price value
 */
const normalizePrice = (price: number, digits = 2): number => {
  // Round to specified digits
  return Math.round(price * Math.pow(10, digits)) / Math.pow(10, digits);
};

const updateIngredientPrices = (
  recipe: RecipeIngredient[]
): RecipeIngredient[] => {
  // Create a copy of the recipe to avoid modifying the original
  const updatedRecipe = [...recipe];

  // Helper function to normalize ingredient names (lowercase, no spaces or symbols)
  const normalizeIngredientName = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // Create a normalized version of our ingredients dictionary for matching
  const normalizedIngredientPrices: {
    [key: string]: { originalKey: string; price: number };
  } = {};

  // Populate the normalized dictionary
  Object.keys(ingredientPrices).forEach((key) => {
    const normalizedKey = normalizeIngredientName(key);
    normalizedIngredientPrices[normalizedKey] = {
      originalKey: key,
      price: ingredientPrices[key],
    };
  });

  // Loop through each ingredient in the recipe
  for (let i = 0; i < updatedRecipe.length; i++) {
    const ingredient = updatedRecipe[i];

    // Get the normalized ingredient name
    const normalizedIngredientName = normalizeIngredientName(ingredient.type);

    // Try to find the exact ingredient name in our normalized dictionary
    if (normalizedIngredientPrices[normalizedIngredientName] !== undefined) {
      // Update the price if found
      updatedRecipe[i] = {
        ...ingredient,
        pricePerGram:
          normalizedIngredientPrices[normalizedIngredientName].price,
      };
      continue;
    }

    // If not found, try to find a partial match
    const partialMatches = Object.keys(normalizedIngredientPrices).filter(
      (key) =>
        normalizedIngredientName.includes(key) ||
        key.includes(normalizedIngredientName)
    );

    if (partialMatches.length > 0) {
      // Sort by length descending to prioritize more specific matches
      // e.g., "groundbeef" over just "beef"
      partialMatches.sort((a, b) => b.length - a.length);

      // Update the price with the best match
      updatedRecipe[i] = {
        ...ingredient,
        pricePerGram: normalizedIngredientPrices[partialMatches[0]].price,
      };
    }
    // If no match found, keep the original price
  }

  return updatedRecipe;
};

/**
 * Recalculate the total home-cooked price based on updated ingredient prices
 */
const recalculateHomeCookedPrice = (recipe: RecipeIngredient[]): number => {
  let totalPrice = 0;

  for (const ingredient of recipe) {
    totalPrice += ingredient.amount * ingredient.pricePerGram;
  }

  // Add a small markup for utilities and miscellaneous ingredients (e.g., salt, pepper, oil)
  // You can adjust this percentage as needed
  const utilityMarkup = 1.15; // 15% markup

  return totalPrice * utilityMarkup;
};

/**
 * Analyzes a food image using OpenAI's GPT-4 Vision model
 */
export const analyzeImage = async (
  imagePath: string,
  given_restaurant_price?: number | null,
  given_homecooked_price?: number | null
): Promise<MealAnalysis> => {
  const startTime = performance.now();
  console.log("Starting OpenAI image analysis for:", imagePath);

  // Validate the image URL is properly formed
  if (!imagePath || (!imagePath.startsWith('http://') && !imagePath.startsWith('https://'))) {
    console.error("Invalid image URL:", imagePath);
    throw new Error("Invalid image URL. URL must start with http:// or https://");
  }

  // Check cache first to ensure consistent results for the same image
  const cacheKey = imagePath + 
    (given_restaurant_price !== undefined && given_restaurant_price !== null ? `-r${given_restaurant_price}` : '') +
    (given_homecooked_price !== undefined && given_homecooked_price !== null ? `-h${given_homecooked_price}` : '');
  
  if (analysisCache[cacheKey]) {
    console.log("Using cached analysis for:", imagePath);
    return JSON.parse(JSON.stringify(analysisCache[cacheKey])); // Return a deep copy of the cached result
  }

  try {
    // STEP 1: Analyze the image using GPT-4 Vision
    const imageCallStartTime = performance.now();
    
    const image_prompt = `You are a food analysis expert. Carefully examine this food image and provide a detailed analysis:

1. Identify the specific dish/meal shown in the image with as much precision as possible
2. List all visible ingredients with estimated quantities in grams
3. Estimate the price per gram for each ingredient (in Canadian dollars)
4. Calculate the total cost to prepare this dish at home (per serving)
5. Estimate what this dish would cost in a restaurant

Use your expertise to analyze only what you can see in the image. Be precise and accurate with the information. 
Base all price estimates on 2025 rates in downtown Toronto, Canada.
If any information cannot be determined from the image, make educated estimates based on similar dishes.`;

    // First API call - analyze the image
    let imageResponse;
    try {
      console.log("Sending image URL to OpenAI:", imagePath);
      imageResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: image_prompt },
              { type: "image_url", image_url: { url: imagePath } }
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0, // Set to 0 for maximum consistency
      });
    } catch (modelError) {
      console.error("OpenAI model error:", modelError);
      throw new Error(`Error analyzing image with OpenAI: ${modelError instanceof Error ? modelError.message : 'Unknown model error'}`);
    }

    const imageCallEndTime = performance.now();
    const imageCallDuration = (imageCallEndTime - imageCallStartTime) / 1000;
    
    const analysisText = imageResponse.choices[0].message.content || "";
    console.log("Image analysis complete. Duration:", imageCallDuration.toFixed(2), "seconds");
    console.log("Analysis text sample:", analysisText.substring(0, 150) + "...");

    // STEP 2: Format the analysis into JSON structure
    const formattingCallStartTime = performance.now();

    const formattingPrompt = `
Format the following food analysis into a strict JSON format with these properties:
- meal: string (name of the meal)
- recipe: array of objects, each with { type: string, amount: number, pricePerGram: number }
- estimatedHomeCookedPrice: number (total price to cook at home)
- restaurantPrice: number (price if bought at restaurant)

The output should be ONLY valid JSON with no additional text or explanations.

Original analysis:
${analysisText}`;

    // Second API call - format the response
    let formattingResponse;
    try {
      formattingResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that formats food analysis data into JSON. Respond with ONLY the JSON, no explanations or other text."
          },
          {
            role: "user",
            content: formattingPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1024,
      });
    } catch (formattingError) {
      console.error("OpenAI formatting error:", formattingError);
      throw new Error(`Error formatting analysis with OpenAI: ${formattingError instanceof Error ? formattingError.message : 'Unknown formatting error'}`);
    }

    const formattingCallEndTime = performance.now();
    const formattingCallDuration = (formattingCallEndTime - formattingCallStartTime) / 1000;
    
    const jsonResponse = formattingResponse.choices[0].message.content || "{}";
    console.log("Formatting complete. Duration:", formattingCallDuration.toFixed(2), "seconds");
    console.log("JSON response sample:", jsonResponse.substring(0, 150) + "...");

    try {
      // Parse the JSON response
      console.log("Attempting to parse JSON response");
      
      let mealInfo: MealAnalysis;
      try {
        mealInfo = JSON.parse(jsonResponse) as MealAnalysis;
        console.log("Successfully parsed JSON response");
        
        // *** Add these lines to update the ingredient prices ***
        console.log("Updating ingredient prices with accurate data");
        
        // Update ingredient prices with our dictionary values
        mealInfo.recipe = updateIngredientPrices(mealInfo.recipe);
        
        // Recalculate the home-cooked price based on our updated ingredient prices
        if (!given_homecooked_price) {
          // Only recalculate if user didn't provide a specific price
          const recalculatedPrice = recalculateHomeCookedPrice(mealInfo.recipe);
          
          // Consider both the AI-generated price and our recalculated price
          // We can use a weighted average or just take the recalculated value
          mealInfo.estimatedHomeCookedPrice = recalculatedPrice;
        }
      } catch (initialParseError) {
        console.error("Initial JSON parse error:", initialParseError);
        
        // Try to extract JSON from the text if it wasn't pure JSON
        const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log("Extracted JSON object from response text");
          try {
            mealInfo = JSON.parse(jsonMatch[0]) as MealAnalysis;
            console.log("Successfully parsed extracted JSON");
          } catch (extractedParseError) {
            console.error("Failed to parse extracted JSON:", extractedParseError);
            throw extractedParseError;
          }
        } else {
          throw initialParseError;
        }
      }

      // Check if we have all required fields
      if (!mealInfo.meal || !mealInfo.recipe || !mealInfo.estimatedHomeCookedPrice || !mealInfo.restaurantPrice) {
        console.warn("Missing required fields in JSON response, using fallback values");
        
        // Extract possible meal name from analysis
        const mealNameMatch = analysisText.match(/(?:meal|dish|food)\s*(?:name|is|:)?\s*[:-]?\s*(.+?)(?:\.|,|\n|$)/i);
        const extractedMealName = mealNameMatch ? mealNameMatch[1].trim() : "Food Dish";
        
        // Create fallback meal info with reasonable defaults
        if (!mealInfo.meal) mealInfo.meal = extractedMealName;
        if (!mealInfo.recipe) mealInfo.recipe = [];
        if (!mealInfo.estimatedHomeCookedPrice) mealInfo.estimatedHomeCookedPrice = 15.00;
        if (!mealInfo.restaurantPrice) mealInfo.restaurantPrice = 35.00;
      }

      // Normalize ingredient prices for consistency
      if (mealInfo.recipe && mealInfo.recipe.length > 0) {
        mealInfo.recipe = mealInfo.recipe.map(ingredient => ({
          ...ingredient,
          amount: normalizePrice(ingredient.amount, 0), // Round to whole grams
          pricePerGram: normalizePrice(ingredient.pricePerGram, 3) // 3 decimal places for price per gram
        }));
      }

      // Normalize prices for consistency
      mealInfo.estimatedHomeCookedPrice = normalizePrice(mealInfo.estimatedHomeCookedPrice);
      mealInfo.restaurantPrice = normalizePrice(mealInfo.restaurantPrice);

      // Apply adjustments and overrides
      if (mealInfo.restaurantPrice > 2 * mealInfo.estimatedHomeCookedPrice) {
        mealInfo.estimatedHomeCookedPrice = normalizePrice(mealInfo.restaurantPrice / 2.12);
      }

      if (given_restaurant_price !== null && given_restaurant_price !== undefined) {
        mealInfo.restaurantPrice = normalizePrice(given_restaurant_price);
      }

      if (given_homecooked_price !== null && given_homecooked_price !== undefined) {
        mealInfo.estimatedHomeCookedPrice = normalizePrice(given_homecooked_price);
      }

      // Ensure home-cooked price is always lower than restaurant price
      if (mealInfo.estimatedHomeCookedPrice >= mealInfo.restaurantPrice) {
        console.log("Home-cooked price is higher than restaurant price, adjusting values");
        // To ensure consistent results, use fixed ratio instead of percentage calculation
        mealInfo.restaurantPrice = normalizePrice(Math.max(20, mealInfo.estimatedHomeCookedPrice * 1.5));
        mealInfo.estimatedHomeCookedPrice = normalizePrice(mealInfo.restaurantPrice * 0.6);
      }

      // Calculate savings with consistent rounding
      mealInfo.saving = normalizePrice(mealInfo.restaurantPrice - mealInfo.estimatedHomeCookedPrice);

      const endTime = performance.now();
      const totalDuration = (endTime - startTime) / 1000;
      console.log("Total analysis time:", totalDuration.toFixed(2), "seconds");
      
      // Cache the result for future requests
      analysisCache[cacheKey] = JSON.parse(JSON.stringify(mealInfo));
      
      return mealInfo;
    } catch (parseError) {
      console.error("Failed to parse meal information:", parseError);
      console.error("Raw JSON response:", jsonResponse);

      // Create fallback data for recovery
      console.log("Creating fallback meal data");
      const fallbackMeal: MealAnalysis = {
        meal: "Food Dish",
        recipe: [],
        estimatedHomeCookedPrice: 15.0,
        restaurantPrice: 35.0,
        saving: 20.0,
      };

      // Cache the fallback result for consistent failure behavior
      analysisCache[cacheKey] = JSON.parse(JSON.stringify(fallbackMeal));

      return fallbackMeal;
    }
  } catch (apiError) {
    console.error("OpenAI API error:", apiError);
    throw apiError;
  }
};

/**
 * Analyzes a food image and returns detailed meal information
 */
export const analyzeFoodImage = async (
  imageUrl: string,
  restaurantPrice?: number,
  homeCookedPrice?: number
): Promise<MealAnalysis> => {
  try {
    const result = await analyzeImage(
      imageUrl,
      restaurantPrice,
      homeCookedPrice
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Processes an uploaded food image and creates structured data for a card display
 * @param imageUrl URL of the uploaded food image
 * @returns Structured data for displaying a food savings card
 */
export const processUploadedFoodImage = async (
  imageUrl: string
): Promise<FoodCardData> => {
  try {
    // Analyze the food image
    const mealAnalysis = await analyzeFoodImage(imageUrl);
    
    // Final check to ensure home-cooked price is always lower than restaurant price
    if (mealAnalysis.estimatedHomeCookedPrice >= mealAnalysis.restaurantPrice) {
      console.log("Final verification: adjusting prices to ensure positive savings");
      const avgPrice = (mealAnalysis.estimatedHomeCookedPrice + mealAnalysis.restaurantPrice) / 2;
      mealAnalysis.restaurantPrice = normalizePrice(avgPrice * 1.4); // 40% above average
      mealAnalysis.estimatedHomeCookedPrice = normalizePrice(avgPrice * 0.6); // 40% below average
      mealAnalysis.saving = normalizePrice(mealAnalysis.restaurantPrice - mealAnalysis.estimatedHomeCookedPrice);
    }

    // Calculate savings percentage
    const savingsPercentage = normalizePrice(
      (mealAnalysis.saving / mealAnalysis.restaurantPrice) * 100,
      1 // Round to 1 decimal place
    );

    // Create card display data with consistent decimal places
    const cardData: FoodCardData = {
      title: mealAnalysis.meal,
      homeCookedPrice: normalizePrice(mealAnalysis.estimatedHomeCookedPrice),
      restaurantPrice: normalizePrice(mealAnalysis.restaurantPrice),
      savings: normalizePrice(mealAnalysis.saving),
      savingsPercentage: savingsPercentage,
      ingredients: mealAnalysis.recipe,
      imageUrl: imageUrl,
    };

    return cardData;
  } catch (error) {
    console.error("Error processing food image:", error);
    throw error;
  }
};

export default analyzeFoodImage;
