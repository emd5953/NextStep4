const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePDF(file_buffer) {
    let tempFilePath = null;
    
    try {
        // Convert base64 to buffer if needed
        let pdfBuffer;
        if (typeof file_buffer === 'string') {
            pdfBuffer = Buffer.from(file_buffer, 'base64');
        } else {
            pdfBuffer = file_buffer;
        }

        // Create temporary file (Assistants API needs file path)
        tempFilePath = path.join(__dirname, `temp-resume-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);
        
        console.log("1. Uploading PDF to OpenAI...");
        
        // Upload the PDF to OpenAI
        const file = await openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: "assistants"
        });
        
        console.log("2. File uploaded:", file.id);
        
        // Create an assistant
        console.log("3. Creating assistant...");
        const assistant = await openai.beta.assistants.create({
            name: "Resume Analyzer",
            instructions: `You are an expert resume analyzer. Extract skills, work experiences, and suggest an appropriate job title from the resume. 
            
Return your response as a JSON object with this exact structure:
{
  "skills": ["skill1", "skill2", ...],
  "experiences": ["Company - Job Title - Duration", ...],
  "jobTitle": "Recommended Job Title"
}`,
            model: "gpt-4o",
            tools: [{ type: "file_search" }]
        });
        
        console.log("4. Assistant created:", assistant.id);
        
        // Create a thread
        console.log("5. Creating thread...");
        const thread = await openai.beta.threads.create({
            messages: [
                {
                    role: "user",
                    content: "Please analyze this resume and extract the skills, experiences, and recommend a job title. Return the data as JSON.",
                    attachments: [
                        {
                            file_id: file.id,
                            tools: [{ type: "file_search" }]
                        }
                    ]
                }
            ]
        });
        
        console.log("6. Thread created:", thread.id);
        
        // Run the assistant
        console.log("7. Running assistant...");
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });
        
        console.log("8. Run started:", run.id);
        
        // Wait for completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        while (runStatus.status !== 'completed') {
            if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
                throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
            }
            
            console.log("9. Waiting for completion... Status:", runStatus.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }
        
        console.log("10. Run completed");
        
        // Get the messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (!assistantMessage || !assistantMessage.content[0]) {
            throw new Error("No response from assistant");
        }
        
        const responseText = assistantMessage.content[0].text.value;
        console.log("11. Response received");
        
        // Clean up
        console.log("12. Cleaning up...");
        await openai.beta.assistants.del(assistant.id);
        await openai.files.del(file.id);
        
        // Parse JSON from response
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }
            
            const parsedJson = JSON.parse(jsonMatch[0]);
            
            // Validate structure
            if (!parsedJson.skills || !parsedJson.experiences || !parsedJson.jobTitle) {
                throw new Error("Invalid response structure");
            }
            
            console.log("13. Success! Extracted:", {
                skillsCount: parsedJson.skills.length,
                experiencesCount: parsedJson.experiences.length,
                jobTitle: parsedJson.jobTitle
            });
            
            return parsedJson;
            
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            console.log("Raw response:", responseText);
            throw new Error(`Failed to parse response: ${parseError.message}`);
        }
        
    } catch (error) {
        console.error('Error analyzing PDF:', error);
        throw error;
    } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log("Temp file deleted");
        }
    }
}

module.exports = analyzePDF;