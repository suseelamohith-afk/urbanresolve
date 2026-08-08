// File: helpers/ai.helper.js

const { GoogleGenAI, Type } = require("@google/genai"); 
const axios = require('axios'); 
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.error("❌ FATAL: GEMINI_API_KEY is not set in .env. AI classification will fail.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function urlToGenerativePart(url, mimeType) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // Convert the binary buffer to a Base64 string
        const base64Data = Buffer.from(response.data).toString('base64');

        return {
            inlineData: {
                data: base64Data,
                mimeType,
            },
        };
    } catch (error) {
        console.error("❌ Failed to fetch and convert image to Base64:", error.message);
        throw new Error("Image pre-processing failed. Cannot classify trash.");
    }
}


exports.classifyTrashPriority = async (mediaPath, mediaType) => {
    
    if (!mediaType.startsWith('image') || !mediaPath) { 
        console.log(`Skipping trash classification for media type: ${mediaType} or missing mediaPath. Defaulting to Medium.`);
        return "Medium";
    }
    
    let imagePart;
    try {
        imagePart = await urlToGenerativePart(mediaPath, mediaType);
    } catch (e) {
        console.error(e.message);
        return "Medium"; 
    }

    // 💡 FINAL MODIFIED PROMPT: Focus entirely on the "High" threshold.
    const strictPrompt = `Analyze the trash image provided. Your task is to apply a very strict priority classification based only on the volume and scale of trash.

    **Classification Rules:**
    1. **HIGH:** If the image shows trash accumulation that is vast, industrial, landfill-like, covering a large land area (e.g., acres), or involves large vehicles/heavy machinery in the context. This requires emergency municipal response.
    2. **SMALL:** If the image shows minimal trash, like a few pieces of litter or a single, moderately overflowing household bin.
    3. **MEDIUM:** Any accumulation that falls between SMALL and HIGH (e.g., a large roadside dump that is not landfill-scale, or a pile requiring a standard dump truck but not machinery).

    Based on these three definitions, generate the classification tag.`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            tag: {
                type: Type.STRING,
                description: "The priority tag based on trash volume: Small, Medium, or High.",
                enum: ["Small", "Medium", "High"],
            },
        },
        required: ["tag"],
    };
    
    const config = {
        // High temperature and system instructions kept to maintain expressiveness.
        temperature: 1.0, 
        systemInstruction: {
            parts: [{ text: "You are a specialized waste volume classification system. You MUST strictly adhere to the provided Classification Rules to select the correct output tag (Small, Medium, or High) in JSON format." }]
        },
        responseMimeType: "application/json",
        responseSchema: responseSchema,
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [imagePart, { text: strictPrompt }],
            config: config,
        });

        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (!jsonText) {
            console.warn("AI returned empty response text.");
            return "Medium";
        }
        
        // Ensure only the expected tag is returned, handling model errors gracefully
        const resultObject = JSON.parse(jsonText);
        const classifiedTag = resultObject?.tag?.trim();
        const validTags = ["Small", "Medium", "High"];

        if (classifiedTag && validTags.includes(classifiedTag)) {
            return classifiedTag;
        } else {
            // Log the problematic classification attempt
            console.warn(`AI Classification failed validation. Returned: "${classifiedTag}".`);
            return "Medium"; 
        }

    } catch (error) {
        console.error("AI Classification Error (JSON parsing or API call failed):", error);
        return "Medium";
    }
};