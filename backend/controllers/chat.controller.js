const Report = require("../models/report.model");
const WorkerUser = require("../models/workeruser.model"); // Needed for populating assignedTo name

// MODIFICATION: Import Node.js SDK and configure
const { GoogleGenAI } = require("@google/genai");

// Retrieve the API key from environment variables (IMPORTANT: Set this in your .env file)
// NOTE: Node.js will read GEMINI_API_KEY from process.env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });


// System Instruction to guide the chatbot's persona and focus
const systemInstruction = "You are Urbo Virtual Assistant, a friendly and professional civic assistant for the UrbanResolve platform in Belagavi. Your primary goal is to answer citizen questions accurately and supportively. You have access to a tool named 'getReportDetails' which you must use when the user asks for the status or details of a specific report ID (e.g., 'What is the status of report fb4985' or '1209BEL001'). Be concise and supportive. Do not mention your tools in the final answer. Use Markdown for strong formatting (**). You must be capable of answering any question asked by the citizen without expecting a specific format.";


/**
 * TOOL FUNCTION: Fetches simplified details of a single report from MongoDB.
 * @param {string} reportId - The unique report identifier (custom ID, full ObjectId, or partial ID like 'fb4985').
 */
const getReportDetails = async (reportId) => {
    try {
        const idQuery = reportId.toUpperCase();
        let report;

        // 1. Search by Custom ID or the exact MongoDB ObjectId
        if (idQuery.length >= 10) {
             report = await Report.findOne({ customReportId: idQuery });
        }
        
        // 2. Search by Partial ID (either Custom ID or ObjectId fragment, like 'fb4985')
        if (!report) {
            // CRITICAL FIX: Use $regex to match the end of the ObjectId or the start of the Custom ID.
            report = await Report.findOne({
                $or: [
                    // Match the end of the ObjectId (user-visible fragment, e.g., 'fb4985')
                    { _id: { $regex: new RegExp(idQuery + '$', 'i') } },
                    // Match the start of the Custom ID (e.g., '1209B')
                    { customReportId: { $regex: new RegExp('^' + idQuery, 'i') } }
                ]
            });
        }
        
        if (!report) {
            return { 
                status: "not_found", 
                message: `Report ID or reference '${reportId}' was not found in the system. Please ensure the ID is correct.` 
            };
        }

        // 3. Format the response data for the LLM to easily understand
        const assignedToName = report.assignedTo ? report.assignedTo.fullName : 'Unassigned';
        const resolutionProof = report.resolutionMediaPath ? 'Yes' : 'No';
        
        // Use customReportId for display, falling back to the ObjectId fragment
        const displayId = report.customReportId || report._id.toString().slice(-6);


        return {
            reportId: displayId,
            status: report.status,
            category: report.category,
            // Snippet of description for context, avoiding sending the whole document
            descriptionSnippet: report.description.substring(0, 50) + '...',
            area: report.area ? report.area.name : 'Unknown',
            assignedTo: assignedToName,
            submittedOn: report.createdAt.toISOString().slice(0, 10),
            isResolved: report.status === 'Resolved',
            resolutionProofAvailable: resolutionProof
        };

    } catch (error) {
        console.error("Database Lookup Error:", error);
        return { 
            status: "error", 
            message: "A database error occurred during lookup. Check server logs." 
        };
    }
};

exports.handleChat = async (req, res) => {
    try {
        // Full history is sent from frontend, including the latest message
        const { history } = req.body; 
        
        if (!history || history.length === 0) {
             return res.status(400).json({ reply: "No message content provided." });
        }

        // Use the received history directly
        const contents = history; 
        let response;
        let replyText;

        // Main loop to handle function calls
        for (let i = 0; i < 5; i++) { 
            
            // Define the tool available to the model
            const generateConfig = {
                tools: [{
                    functionDeclarations: [
                        {
                            name: "getReportDetails",
                            description: "Provides the status, category, and assignment details for a civic report using its unique ID (e.g., 1209BEL001 or a partial ID like 'fb4985').",
                            parameters: {
                                type: "object",
                                properties: {
                                    reportId: {
                                        type: "string",
                                        description: "The full or partial report identifier provided by the user (e.g., '1209BEL001' or 'fb4985')."
                                    }
                                },
                                required: ["reportId"]
                            }
                        }
                    ]
                }],
                systemInstruction: { parts: [{ text: systemInstruction }] }
            };

            response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contents,
                config: generateConfig,
            });

            const candidate = response.candidates?.[0];

            // 1. Check for function call request
            if (candidate?.functionCalls?.[0]) {
                const call = candidate.functionCalls[0];
                const { name, args } = call;
                let toolResult;

                // Execute the requested tool
                switch (name) {
                    case "getReportDetails":
                        // Execute the MongoDB lookup function
                        toolResult = await getReportDetails(args.reportId);
                        break;
                    default:
                        toolResult = { error: `Unknown tool requested: ${name}` };
                }

                // Add the function result back to the conversation history
                contents.push({ 
                    role: 'function', 
                    parts: [{ 
                        functionResponse: { 
                            name: name, 
                            response: toolResult 
                        } 
                    }] 
                });

            } else {
                // 2. If no function call is made, the model's text is the final answer
                replyText = candidate?.content?.parts?.[0]?.text || "I was unable to generate a coherent response. The server may have returned empty data.";
                break; // Exit the loop as the final reply is generated
            }
        }

        // Final check if reply was generated
        if (!replyText) {
            replyText = "I encountered a problem processing your request due to complexity. Please try simplifying your query.";
        }

        // 3. Send the final response back to the frontend
        res.status(200).json({
            reply: replyText,
            sources: response.candidates?.[0]?.groundingMetadata?.groundingAttributions.map(attr => ({ 
                title: attr.web?.title, 
                uri: attr.web?.uri 
            })) || [],
        });

    } catch (error) {
        console.error("Server Chat Execution Error:", error);
        res.status(500).json({ 
            reply: "❌ Sorry, the virtual assistant service is experiencing a critical server issue.", 
            error: error.message 
        });
    }
};