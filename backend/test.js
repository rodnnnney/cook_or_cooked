import { Groq } from "groq-sdk";
import dotenv from 'dotenv';

dotenv.config();
// Allow for API key to come from env or use the provided one
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

const image_url = "https://fedandfull.com/wp-content/uploads/2019/02/Grilled-tomahawk-rib-eye.jpg"

// Helper function to analyze images (mock for now)
// given_restaurant_price, given_homecooked_price are optional -> if provided, provide as a float
const analyzeImage = async (imagePath, given_restaurant_price = null, given_homecooked_price = null) => {
    const startTime = performance.now();
    console.log(`[INFO] Starting image analysis for: ${imagePath}`);
    console.log(`[INFO] Input parameters - Restaurant price: ${given_restaurant_price}, Home-cooked price: ${given_homecooked_price}`);
    
    // Setting up Groq API
    const groq = new Groq({
        apiKey: GROQ_API_KEY
    });
    console.log('[INFO] Groq client initialized');
  
    try {
        // CALL ONE: Analyze the image
        // Note: Groq might not support direct image analysis, so we're sending the URL as text
        console.log('[INFO] Making first API call to analyze image...');
        const imageCallStartTime = performance.now();
        const image_prompt = `Examine the image at this URL: ${imagePath} and determine the following and put it into its own category: 1. The name of the meal 2. recipe (each ingredient type, amount in grams, and price per gram in dollars) 3. meal price if cooked at home (divide it such that it's for one serving) 4. meal price if bought at a restaurant. Base these on 2025 prices in downtown Toronto. All prices should be in Canadian dollars.`;
        
        const image_response = await groq.chat.completions.create({
            model: "llama3-70b-8192", // Use Groq's appropriate model
            messages: [
                {
                    role: "user",
                    content: image_prompt
                }
            ],
            temperature: 0,
            max_tokens: 1024
        });
        
        const imageCallEndTime = performance.now();
        const imageCallDuration = (imageCallEndTime - imageCallStartTime) / 1000;
        const text_response = image_response.choices[0].message.content;
        console.log(`[INFO] First API call completed in ${imageCallDuration.toFixed(2)}s`);
        console.log('[DEBUG] Initial text response:', text_response.substring(0, 150) + '...');
      
        // CALL TWO: Format the response
        console.log('[INFO] Making second API call to format response...');
        const formatCallStartTime = performance.now();
        const formatting_prompt = "Format the response into a JSON schema with the following keys: meal (which is the name of the meal), recipe (which is an array of objects with the following keys: type, amount, pricePerGram:), estimatedHomeCookedPrice (which is the price of the meal if cooked at home), restaurantPrice (which is the price of the meal if bought at a restaurant). The recipe should be an array of objects with the following keys: type, amount, pricePerGram. The estimatedHomeCookedPrice and restaurantPrice should be numbers. Output ONLY valid JSON with no additional text.";
        
        const response = await groq.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [
                {
                    role: "system",
                    content: formatting_prompt
                },
                {
                    role: "user",
                    content: text_response
                }
            ],
            temperature: 0.2,
            max_tokens: 1024
        });
        
        const formatCallEndTime = performance.now();
        const formatCallDuration = (formatCallEndTime - formatCallStartTime) / 1000;
        console.log(`[INFO] Second API call completed in ${formatCallDuration.toFixed(2)}s`);
        
        let responseText = response.choices[0].message.content;
        console.log('[DEBUG] Formatted response:', responseText.substring(0, 150) + '...');
        
        // Extract JSON if the model added any explanatory text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseText = jsonMatch[0];
            console.log('[INFO] Extracted JSON from response');
        }
        
        const processingStartTime = performance.now();
        try {
            const mealInfo = JSON.parse(responseText);
            console.log('[INFO] Successfully parsed JSON response');
            console.log('[DEBUG] Parsed meal info:', mealInfo);
          
            // LAST STEP: OVERRIDES AND CALCULATIONS
            console.log('[INFO] Applying overrides and calculations...');
            let originalHomeCookedPrice = mealInfo.estimatedHomeCookedPrice;
            let originalRestaurantPrice = mealInfo.restaurantPrice;
            
            if (mealInfo.restaurantPrice > 2 * mealInfo.estimatedHomeCookedPrice) { 
                console.log('[INFO] Adjusting home-cooked price based on restaurant price ratio');
                mealInfo.estimatedHomeCookedPrice = mealInfo.restaurantPrice / 2.12;
                console.log(`[DEBUG] Home-cooked price adjusted from $${originalHomeCookedPrice} to $${mealInfo.estimatedHomeCookedPrice}`);
            }
            
            if (given_restaurant_price != null) {
                console.log(`[INFO] Overriding restaurant price with provided value: $${given_restaurant_price}`);
                mealInfo.restaurantPrice = given_restaurant_price;
            }
            
            if (given_homecooked_price != null) {
                console.log(`[INFO] Overriding home-cooked price with provided value: $${given_homecooked_price}`);
                mealInfo.estimatedHomeCookedPrice = given_homecooked_price;
            }
            
            mealInfo.saving = mealInfo.restaurantPrice - mealInfo.estimatedHomeCookedPrice;
            console.log(`[INFO] Calculated savings: $${mealInfo.saving}`);
            
            const processingEndTime = performance.now();
            const processingDuration = (processingEndTime - processingStartTime) / 1000;
            console.log(`[INFO] Processing completed in ${processingDuration.toFixed(2)}s`);
        
            const endTime = performance.now();
            const totalDuration = (endTime - startTime) / 1000;
            console.log(`[INFO] Final meal info:`, mealInfo);
            console.log(`[TIMING] Total execution time: ${totalDuration.toFixed(2)}s`);
            console.log(`[TIMING] Breakdown - Image analysis: ${imageCallDuration.toFixed(2)}s, Formatting: ${formatCallDuration.toFixed(2)}s, Processing: ${processingDuration.toFixed(2)}s`);
            return mealInfo;
        } catch (parseError) {
            const endTime = performance.now();
            const totalDuration = (endTime - startTime) / 1000;
            console.error('[ERROR] Failed to parse JSON response:', parseError);
            console.error('[ERROR] Raw response data:', responseText);
            console.error(`[TIMING] Failed after ${totalDuration.toFixed(2)}s`);
            throw new Error('Failed to parse meal information');
        }
    } catch (apiError) {
        const endTime = performance.now();
        const totalDuration = (endTime - startTime) / 1000;
        console.error('[ERROR] API call failed:', apiError);
        console.error(`[TIMING] Failed after ${totalDuration.toFixed(2)}s`);
        throw apiError;
    }
};
  
console.log('[INFO] Starting analysis process...');
const overallStartTime = performance.now();
analyzeImage(image_url)
    .then(result => {
        const overallEndTime = performance.now();
        const overallDuration = (overallEndTime - overallStartTime) / 1000;
        console.log('[INFO] Analysis completed successfully');
        console.log(`[TIMING] Overall process time (including promise resolution): ${overallDuration.toFixed(2)}s`);
        console.log('[RESULT]', result);
    })
    .catch(error => {
        const overallEndTime = performance.now();
        const overallDuration = (overallEndTime - overallStartTime) / 1000;
        console.error('[ERROR] Analysis failed:', error);
        console.error(`[TIMING] Failed after ${overallDuration.toFixed(2)}s`);
    });



