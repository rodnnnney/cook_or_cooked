import { Groq } from "groq-sdk";

const GROQ_API_KEY =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  "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";

export const analyzeImage = async (
  imagePath: string,
  given_restaurant_price = null,
  given_homecooked_price = null
) => {
  const startTime = performance.now();

  const groq = new Groq({
    apiKey: GROQ_API_KEY,
  });

  try {
    const imageCallStartTime = performance.now();
    const image_prompt = `Examine the image at this URL: ${imagePath} and determine the following and put it into its own category: 1. The name of the meal 2. recipe (each ingredient type, amount in grams, and price per gram in dollars) 3. meal price if cooked at home (divide it such that it's for one serving) 4. meal price if bought at a restaurant. Base these on 2025 prices in downtown Toronto. All prices should be in Canadian dollars.`;

    const image_response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "user",
          content: image_prompt,
        },
      ],
      temperature: 0,
      max_tokens: 1024,
    });

    const imageCallEndTime = performance.now();
    const imageCallDuration = (imageCallEndTime - imageCallStartTime) / 1000;
    const text_response = image_response.choices[0].message.content;

    // CALL TWO: Format the response
    const formatCallStartTime = performance.now();
    const formatting_prompt =
      "Format the response into a JSON schema with the following keys: meal (which is the name of the meal), recipe (which is an array of objects with the following keys: type, amount, pricePerGram:), estimatedHomeCookedPrice (which is the price of the meal if cooked at home), restaurantPrice (which is the price of the meal if bought at a restaurant). The recipe should be an array of objects with the following keys: type, amount, pricePerGram. The estimatedHomeCookedPrice and restaurantPrice should be numbers. Output ONLY valid JSON with no additional text.";

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: formatting_prompt,
        },
        {
          role: "user",
          content: text_response,
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const formatCallEndTime = performance.now();
    const formatCallDuration = (formatCallEndTime - formatCallStartTime) / 1000;

    let responseText = response.choices[0].message.content;

    // Extract JSON if the model added any explanatory text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    const processingStartTime = performance.now();
    try {
      const mealInfo = JSON.parse(responseText);

      // LAST STEP: OVERRIDES AND CALCULATIONS
      let originalHomeCookedPrice = mealInfo.estimatedHomeCookedPrice;
      let originalRestaurantPrice = mealInfo.restaurantPrice;

      if (mealInfo.restaurantPrice > 2 * mealInfo.estimatedHomeCookedPrice) {
        mealInfo.estimatedHomeCookedPrice = mealInfo.restaurantPrice / 2.12;
      }

      if (given_restaurant_price !== null) {
        mealInfo.restaurantPrice = given_restaurant_price;
      }

      if (given_homecooked_price !== null) {
        mealInfo.estimatedHomeCookedPrice = given_homecooked_price;
      }

      mealInfo.saving =
        mealInfo.restaurantPrice - mealInfo.estimatedHomeCookedPrice;

      return mealInfo;
    } catch (parseError) {
      throw new Error("Failed to parse meal information");
    }
  } catch (apiError) {
    throw apiError;
  }
};

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

// Update the exported function with proper type annotations
export const analyzeFoodImage = async (
  imageUrl: string,
  restaurantPrice?: number,
  homeCookedPrice?: number
): Promise<MealAnalysis> => {
  try {
    const result = await analyzeImage(
      imageUrl,
      restaurantPrice || null,
      homeCookedPrice || null
    );
    return result;
  } catch (error) {
    throw error;
  }
};
export default analyzeFoodImage;
