const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10000, // 10 second timeout
});

// 🚀 OPTIMIZATION: In-memory cache for embeddings (LRU with 100 entries)
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 100;
let apiCallCount = 0;
let cacheHitCount = 0;

// Function to generate embeddings using OpenAI (consistent model)
async function generateEmbeddings(text) {
    if(!text) {
        throw new Error("Text is required for generating embeddings");
    }

    // Check cache first
    const cacheKey = text.trim().toLowerCase().substring(0, 500); // Use first 500 chars as key
    if (embeddingCache.has(cacheKey)) {
        cacheHitCount++;
        console.log(`✅ Embedding cache hit (${cacheHitCount}/${apiCallCount + cacheHitCount} total)`);
        return embeddingCache.get(cacheKey);
    }

    try {
        apiCallCount++;
        console.log(`🔄 OpenAI API call #${apiCallCount} (cache hits: ${cacheHitCount})`);
        
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Consistent 1536-dimensional embeddings
            input: text,
            encoding_format: "float",
        });
        
        const embedding = response.data[0].embedding;
        
        // Cache the result (LRU eviction)
        if (embeddingCache.size >= MAX_CACHE_SIZE) {
            const firstKey = embeddingCache.keys().next().value;
            embeddingCache.delete(firstKey);
        }
        embeddingCache.set(cacheKey, embedding);
        
        return embedding;
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
}

// Get API usage stats
function getEmbeddingStats() {
    return {
        apiCalls: apiCallCount,
        cacheHits: cacheHitCount,
        cacheSize: embeddingCache.size,
        hitRate: apiCallCount + cacheHitCount > 0 
            ? (cacheHitCount / (apiCallCount + cacheHitCount) * 100).toFixed(1) + '%'
            : '0%'
    };
}

// Clear embedding cache
function clearEmbeddingCache() {
    embeddingCache.clear();
    console.log('Embedding cache cleared');
}


async function parseSearchCriteria(text) {
    try {
        apiCallCount++;
        console.log(`🔄 OpenAI API call #${apiCallCount} (parseSearchCriteria)`);
        
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
            max_tokens: 500,
            timeout: 8000 // 8 second timeout
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
        apiCallCount++;
        console.log(`🔄 OpenAI API call #${apiCallCount} (isThisAGoodMatch)`);
        
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
            max_tokens: 500,
            timeout: 8000 // 8 second timeout
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
    // 🚀 OPTIMIZATION: Skip AI refinement if vector scores are already good (>0.75)
    const highScoreJobs = results.filter(job => job.score && job.score > 0.75);
    if (highScoreJobs.length >= 5) {
        console.log(`⚡ Skipping AI refinement - ${highScoreJobs.length} jobs already have high vector scores`);
        return results.map(job => ({
            ...job,
            match: job.score > 0.75 ? 'great' : job.score > 0.65 ? 'good' : 'poor',
            additionalInfo: 'Matched based on semantic similarity'
        }));
    }
    
    // Batch process jobs for better performance
    const batchSize = 10;
    const enhancedJobs = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        
        try {
            apiCallCount++;
            console.log(`🔄 OpenAI API call #${apiCallCount} (refineFoundPositions batch ${Math.floor(i/batchSize) + 1})`);
            
            // Create a single prompt for batch analysis
            const jobDescriptions = batch.map((job, index) => 
                `Job ${index + 1}:
Title: ${job.title}
Company: ${job.companyName || 'Not specified'}
Location: ${job.locations?.join(', ') || 'Not specified'}
Salary: ${job.salaryRange || 'Not specified'}
Skills: ${job.skills?.slice(0, 5).join(', ') || 'Not specified'}
Description: ${job.jobDescription?.substring(0, 200) || 'Not specified'}
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
                max_tokens: 1000,
                timeout: 10000 // 10 second timeout
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

module.exports = { 
    parseSearchCriteria, 
    generateEmbeddings, 
    refineFoundPositions,
    getEmbeddingStats,
    clearEmbeddingCache
};