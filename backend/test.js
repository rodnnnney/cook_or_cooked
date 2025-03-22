import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set. Please add it to your .env file.');
    process.exit(1);
  }


const image_url = "https://fedandfull.com/wp-content/uploads/2019/02/Grilled-tomahawk-rib-eye.jpg"

// Helper function to analyze images (mock for now)
// given_restaurant_price, given_homecooked_price are optional -> if provided, provide as a float
const analyzeImage = async (imagePath, given_restaurant_price = null, given_homecooked_price = null) => {
    // Setting up OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: openaiApiKey
    });
  
    // CALL ONE: Analyze the image
    const image_prompt = "Examine this image and determine the following and put it into its own category: 1. The name of the meal 2. recipe (each ingredient type, amount in grams, and price per gram in dollars) 3. meal price if cooked at home (divide it such that it's for one serving) 4. meal price if bought at a restaurant. Base these on 2025 prices in downtown Toronto. All prices should be in Canadian dollars.";
    const image_response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [{
            role: "user",
            content: [
                { type: "input_text", text: image_prompt },
                {
                    type: "input_image",
                    image_url: imagePath,
                },
            ],
        }],
    });
    const text_response = image_response.output_text;
  
    // CALL TWO: Format the response
    const formatting_prompt = "Format the response into a JSON schema with the following keys: meal (which is the name of the meal), recipe (which is an array of objects with the following keys: type, amount, pricePerGram:), estimatedHomeCookedPrice (which is the price of the meal if cooked at home), restaurant_price (which is the price of the meal if bought at a restaurant). The recipe should be an array of objects with the following keys: ingredient_type, amount, price_per_gram. The home_price and restaurant_price should be a numbers.";
    const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: formatting_prompt
          },
          {
            role: "user",
            content: text_response
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "meal_info",
            schema: {
              type: "object",
              properties: {
                meal: { type: "string" },
                recipe: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      amount: { type: "string" },
                      pricePerGram: { type: "number" }
                    },
                    required: ["type", "amount", "pricePerGram"],
                    additionalProperties: false
                  }
                },
                estimatedHomeCookedPrice: { type: "number" },
                restaurantPrice: { type: "number" }
              },
              required: [
                "meal",
                "recipe",
                "estimatedHomeCookedPrice",
                "restaurantPrice"
              ],
              additionalProperties: false
            }
          }
        }
      });
    const mealInfo = JSON.parse(response.output_text);
  
    // LAST STEP: OVERRIDES AND CALCULATIONS
    if (mealInfo.restaurantPrice > 2 * mealInfo.estimatedHomeCookedPrice) { // adjust for inflation and other factors (labour, transport, etc)
        mealInfo.estimatedHomeCookedPrice = mealInfo.restaurantPrice / 2.12;
    }
    if (given_restaurant_price != null) {
        mealInfo.restaurantPrice = given_restaurant_price;
    }
    if (given_homecooked_price != null) {
        mealInfo.estimatedHomeCookedPrice = given_homecooked_price;
    }
    mealInfo.saving = mealInfo.restaurantPrice - mealInfo.estimatedHomeCookedPrice;

    console.log(mealInfo);
    return mealInfo;
  
  };
  

const monke = analyzeImage(image_url, 69, 10);
console.log(monke);



