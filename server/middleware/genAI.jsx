const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate embeddings using OpenAI (consistent model)
async function generateEmbeddings(text) {
    if(!text) {
        throw new Error("Text is required for generating embeddings");
    }

    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Consistent 1536-dimensional embeddings
            input: text,
            encoding_format: "float",
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
}


async function parseSearchCriteria(text) {
    try {
        const extractionPrompt = `Analyze the following search criteria for a job and extract any mentioned charachteristics of a job. 
You must respond with a valid JSON object in the following format:
{
    "locations": ["array of locations mentioned"],
    "salaryRange": {minimum: minimum-salary, maximum: maximum-salary},
    "my_requirements": "what i am specifically looking for, if specified, otherwise null",
    "skills": ["array of skills mentioned"],
    "company": "company name, if specified, otherwise null",

}

If no salary range is found, return empty object for that field. if either min or max are not found, return null for that field. 
Do not include any additional text or explanation, only return the JSON object.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that helps a jobseeker analyze a jobseeker's search criteria for a job. You will analyze the search criteria and return a json object with the following fields: locations, salaryRange, my_requirements, skills, company. Do not include any additional text or explanation, only return the JSON object."
                },
                {
                    role: "user",
                    content: `${extractionPrompt}\n\nText to analyze:\n${text}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        if (response.choices && response.choices[0]?.message?.content) {
            try {
                // Extract JSON from the response content
                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON object found in response");
                }
                const parsedJson = JSON.parse(jsonMatch[0]);
                return parsedJson;
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw response:", response.choices[0].message.content);
                throw parseError;
            }
        } else {
            throw new Error("Could not extract content from the response");
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function isThisAGoodMatch(description, criteria) {
    try {
        const answerPrompt = `Analyze the following job description and determine if it matches the search criteria. 
You must respond with a valid JSON object in the following format:
{
    "match": "poor/good/great",
    "additionalInfo": "your reasoning for the match"
}

Do not include any additional text or explanation, only return the JSON object.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that helps determine if a job description matches the critera specified by a jobseeker. You will analyze the job posting and determine if it is a good match. You will respond with a json document comprising of three fields - 'match' - poor/good/great, 'additionalInfo' - describing to the jobseeker why you think what you think about the match. In additional info, you will write as if you are speaking directly to the jobseeker."
                },
                {
                    role: "user", 
                    content: `Job description: ${description}\n\nCriteria:\n${criteria}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        if (response.choices && response.choices[0]?.message?.content) {
            try {
                // Extract JSON from the response content
                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON object found in response");
                }
                const parsedJson = JSON.parse(jsonMatch[0]);
                return parsedJson;
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw response:", response.choices[0].message.content);
                throw parseError;
            }
        } else {
            throw new Error("Could not extract content from the response");
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function refineFoundPositions(results, basedOnThisCriteria) {
    // Batch process jobs for better performance
    const batchSize = 10;
    const enhancedJobs = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        
        try {
            // Create a single prompt for batch analysis
            const jobDescriptions = batch.map((job, index) => 
                `Job ${index + 1}:
Title: ${job.title}
Company: ${job.companyName || 'Not specified'}
Location: ${job.locations?.join(', ') || 'Not specified'}
Salary: ${job.salaryRange || 'Not specified'}
Skills: ${job.skills?.join(', ') || 'Not specified'}
Description: ${job.jobDescription}
---`
            ).join('\n\n');

            const batchPrompt = `Analyze the following ${batch.length} job postings against the search criteria and rate each as "poor", "good", or "great" match.

Search Criteria: ${basedOnThisCriteria}

Jobs to analyze:
${jobDescriptions}

Respond with a JSON array where each object has:
{
    "jobIndex": number (1-${batch.length}),
    "match": "poor/good/great",
    "reason": "brief explanation"
}

Only return the JSON array, no additional text.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a job matching expert. Analyze job postings and rate how well they match search criteria. Return only a JSON array."
                    },
                    {
                        role: "user",
                        content: batchPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            
            if (jsonMatch) {
                const analyses = JSON.parse(jsonMatch[0]);
                
                // Map analyses back to jobs
                batch.forEach((job, index) => {
                    const analysis = analyses.find(a => a.jobIndex === index + 1);
                    enhancedJobs.push({
                        ...job,
                        match: analysis?.match || 'good',
                        additionalInfo: analysis?.reason || 'Match analysis unavailable'
                    });
                });
            } else {
                // Fallback: mark all as good matches
                batch.forEach(job => {
                    enhancedJobs.push({
                        ...job,
                        match: 'good',
                        additionalInfo: 'Match analysis unavailable'
                    });
                });
            }
        } catch (error) {
            console.error('Error in batch analysis:', error);
            // Fallback: mark all as good matches
            batch.forEach(job => {
                enhancedJobs.push({
                    ...job,
                    match: 'good',
                    additionalInfo: 'Match analysis unavailable'
                });
            });
        }
    }

    // Sort jobs by match quality (great -> good -> poor)
    const sortedJobs = enhancedJobs.sort((a, b) => {
        const matchOrder = { great: 0, good: 1, poor: 2 };
        return matchOrder[a.match] - matchOrder[b.match];
    });

    return sortedJobs;
}

module.exports = { parseSearchCriteria, generateEmbeddings, refineFoundPositions };