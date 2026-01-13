const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { parseSearchCriteria, generateEmbeddings, refineFoundPositions } = require("../middleware/genAI.jsx");
const jobApiService = require("../services/jobApiService.jsx");

/**
 * Controller for handling job-related operations
 * @namespace jobsController
 */
const jobsController = {

  /**
   * Retrieves all jobs with optional search functionality
   * Combines internal jobs with external API jobs
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.q] - Search query string
   * @param {boolean} [req.query.includeExternal] - Include external jobs (default: true)
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of matching jobs
   * @throws {Error} 500 if server error occurs
   */
  getAllJobs: async (req, res) => {
    try {
      const queryText = req.query.q || "";
      const includeExternal = req.query.includeExternal !== 'false'; // Default to true
      
      // Get internal jobs first (always fast)
      let internalJobs = [];
      try {
        if (!queryText) {
          internalJobs = await jobsDirectSearch(req);
        } else {
          // Try semantic search first, fallback to direct search if it fails
          try {
            internalJobs = await jobsSemanticSearch(req);
          } catch (semanticError) {
            console.warn('Semantic search failed, falling back to direct search:', semanticError.message);
            internalJobs = await jobsDirectSearch(req);
          }
        }
      } catch (error) {
        console.error('Error fetching internal jobs:', error.message);
        internalJobs = []; // Continue with empty internal jobs
      }

      // Get external jobs asynchronously (non-blocking)
      let externalJobs = [];
      if (includeExternal && process.env.JSEARCH_API_KEY && process.env.JSEARCH_API_KEY !== 'your_jsearch_api_key_here') {
        try {
          const searchParams = {
            query: queryText || 'software developer', // Use default search if no query provided
            page: 1,
            num_pages: 3 // Increased to get more jobs
          };
          
          // Parse location from query if available
          if (queryText && queryText.toLowerCase().includes('location:')) {
            const locationMatch = queryText.match(/location:\s*([^,]+)/i);
            if (locationMatch) {
              searchParams.location = locationMatch[1].trim();
            }
          }
          
          // Reduced timeout for external API call
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('External API timeout')), 3000)
          );
          
          externalJobs = await Promise.race([
            jobApiService.searchJobs(searchParams),
            timeoutPromise
          ]);
        } catch (error) {
          console.error('Error fetching external jobs:', error.message);
          // Continue with internal jobs only if external API fails
          externalJobs = [];
        }
      }

      // Combine internal and external jobs
      let allJobs = [...internalJobs, ...externalJobs];

      //-------------------------------------
      const token = req.headers.authorization?.split(" ")[1];

      // Get user ID from token if available
      let userId = null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
      const applicationsCollection = req.app.locals.db.collection("applications");

      // If user is logged in, get their applied jobs and filter results
      let finalResults = allJobs;
      if (userId) {
        const appliedJobs = await applicationsCollection
          .find({ user_id: ObjectId.createFromHexString(userId) })
          .project({ job_id: 1, _id: 0 })
          .toArray();

        const appliedJobIds = appliedJobs.map(app => app.job_id.toString());
        finalResults = allJobs.filter(job => !appliedJobIds.includes(job._id.toString()));
      }

      res.status(200).json(finalResults);


    } catch (error) {
      res.status(500).json({ error: `Error searching jobs. ${error}` });
    }
  },

  /**
   * Retrieves a single job by its ID
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.jobId - Job ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Job details
   * @throws {Error} 400 if job ID is invalid
   * @throws {Error} 404 if job not found
   * @throws {Error} 500 if server error occurs
   */
  getJobById: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const jobId = req.params.jobId;

      if (!ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: "Invalid job ID format" });
      }

      const job = await jobsCollection.aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(jobId)
          }
        },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      if (!job || job.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.status(200).json(job[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job details" });
    }
  },

// Replace the entire getHomepageJobsUsingSemanticSearch function in jobsController.js with this:

  getHomepageJobsUsingSemanticSearch: async (req, res) => {
    try {
      console.log("🏠 Homepage job matching started");
      
      // Get user profile with cached embedding
      const token = req.headers.authorization?.split(" ")[1];
      let userId = null;
      let queryEmbedding = null;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
          console.log("👤 User ID:", userId);
          
          // Get user's cached embedding
          const usersCollection = req.app.locals.db.collection("users");
          const user = await usersCollection.findOne(
            { _id: ObjectId.createFromHexString(userId) },
            { projection: { skillsEmbedding: 1, skills: 1, location: 1, email: 1 } }
          );
          
          console.log("📋 User profile:", {
            email: user?.email,
            hasSkills: !!(user?.skills && user.skills.length > 0),
            hasLocation: !!user?.location,
            hasEmbedding: !!user?.skillsEmbedding,
            embeddingLength: user?.skillsEmbedding?.length
          });
          
          if (user && user.skillsEmbedding && user.skillsEmbedding.length === 1536) {
            queryEmbedding = user.skillsEmbedding;
            console.log("✅ Using cached embedding (1536 dimensions)");
          } else if (user && (user.skills || user.location)) {
            // Generate and cache if not exists
            console.log("⚠️ No valid cached embedding, generating new one...");
            let textToEmbed = '';
            if (user.skills && user.skills.length > 0) {
              textToEmbed = `skills: ${user.skills.join(', ')}`;
            }
            if (user.location) {
              textToEmbed += ` location: ${user.location}`;
            }
            
            console.log("🎯 Text to embed:", textToEmbed);
            
            if (textToEmbed.trim()) {
              queryEmbedding = await generateEmbeddings(textToEmbed);
              console.log("✅ Generated embedding with dimensions:", queryEmbedding.length);
              
              // Cache it for next time
              await usersCollection.updateOne(
                { _id: ObjectId.createFromHexString(userId) },
                { 
                  $set: { 
                    skillsEmbedding: queryEmbedding, 
                    embeddingGeneratedAt: new Date(),
                    embeddingModel: 'text-embedding-3-small'
                  } 
                }
              );
              console.log("💾 Embedding cached for future use");
            }
          } else {
            console.log("❌ User has no skills or location");
          }
        } catch (error) {
          console.error("❌ Error getting user embedding:", error);
        }
      } else {
        console.log("❌ No authentication token provided");
      }

      if (!queryEmbedding) {
        console.log("🚫 No query embedding available, returning error");
        return res.status(400).json({ 
          error: "Please add skills and location to your profile to get job recommendations" 
        });
      }

      console.log("🔍 Performing vector search...");
      
      // Check if vector index exists and jobs have embeddings
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const sampleJob = await jobsCollection.findOne({ embedding: { $exists: true } });
      
      if (!sampleJob) {
        console.log("⚠️ No jobs with embeddings found, falling back to regular search");
        // Fallback to regular job search
        const fallbackJobs = await jobsCollection.aggregate([
          {
            $lookup: {
              from: "companies",
              localField: "companyId",
              foreignField: "_id",
              as: "companyInfo"
            }
          },
          {
            $unwind: {
              path: "$companyInfo",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              companyName: "$companyInfo.name",
              companyWebsite: "$companyInfo.website",
              jobDescription: 1,
              salaryRange: 1,
              locations: 1,
              benefits: 1,
              schedule: 1,
              skills: 1
            }
          },
          { $limit: 20 }
        ]).toArray();
        
        console.log("📊 Fallback jobs found:", fallbackJobs.length);
        return res.status(200).json(fallbackJobs);
      }

      console.log("✅ Sample job has embedding with dimensions:", sampleJob.embedding?.length);

      // Perform vector search using cached embedding
      let results = [];
      try {
        results = await jobsCollection.aggregate([
          {
            $vectorSearch: {
              queryVector: queryEmbedding,
              path: "embedding",
              numCandidates: 100,
              limit: 20,
              index: "js_vector_index",
            }
          },
          {
            $lookup: {
              from: "companies",
              localField: "companyId",
              foreignField: "_id",
              as: "companyInfo"
            }
          },
          {
            $unwind: {
              path: "$companyInfo",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              companyName: "$companyInfo.name",
              companyWebsite: "$companyInfo.website",
              jobDescription: 1,
              salaryRange: 1,
              locations: 1,
              benefits: 1,
              schedule: 1,
              skills: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]).toArray();
        
        console.log("🎯 Vector search returned:", results.length, "results");
        if (results.length > 0) {
          console.log("📊 Score range:", 
            Math.min(...results.map(r => r.score)).toFixed(3), 
            "to", 
            Math.max(...results.map(r => r.score)).toFixed(3)
          );
        }
      } catch (vectorError) {
        console.error("❌ Vector search failed:", vectorError);
        // Fallback to regular search
        results = await jobsCollection.aggregate([
          {
            $lookup: {
              from: "companies",
              localField: "companyId",
              foreignField: "_id",
              as: "companyInfo"
            }
          },
          {
            $unwind: {
              path: "$companyInfo",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              companyName: "$companyInfo.name",
              companyWebsite: "$companyInfo.website",
              jobDescription: 1,
              salaryRange: 1,
              locations: 1,
              benefits: 1,
              schedule: 1,
              skills: 1
            }
          },
          { $limit: 20 }
        ]).toArray();
        console.log("🔄 Fallback search returned:", results.length, "results");
      }

      // Filter out low-score results (only if we have scores)
      let filteredResults = results;
      if (results.length > 0 && results[0].score !== undefined) {
        const originalCount = results.length;
        filteredResults = results.filter(result => result.score > 0.55); // Lowered threshold
        console.log(`🎯 Filtered from ${originalCount} to ${filteredResults.length} jobs (score > 0.55)`);
        
        // If too few high-quality results, include more
        if (filteredResults.length < 5) {
          filteredResults = results.slice(0, 10);
          console.log("📈 Included more results due to low count:", filteredResults.length);
        }
      }

      // Filter out already applied jobs
      if (userId) {
        const applicationsCollection = req.app.locals.db.collection("applications");
        const appliedJobs = await applicationsCollection
          .find({ user_id: ObjectId.createFromHexString(userId) })
          .project({ job_id: 1, _id: 0 })
          .toArray();

        const appliedJobIds = appliedJobs.map(app => app.job_id.toString());
        const beforeFilter = filteredResults.length;
        filteredResults = filteredResults.filter(job => !appliedJobIds.includes(job._id.toString()));
        console.log(`🚫 Filtered out ${beforeFilter - filteredResults.length} already applied jobs`);
      }

      console.log("✅ Final result count:", filteredResults.length);
      res.status(200).json(filteredResults);
      
    } catch (error) {
      console.error("❌ Error in getHomepageJobsUsingSemanticSearch:", error);
      res.status(500).json({ error: "Failed to search jobs", details: error.message });
    }
  },
  // Get jobs for homepage
  getHomepageJobs: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const applicationsCollection = req.app.locals.db.collection("applications");

      const queryText = req.query.q || "";
      const query = {
        $or: [
          { title: { $regex: queryText, $options: "i" } },
          { jobDescription: { $regex: queryText, $options: "i" } },
          { skills: { $regex: queryText, $options: "i" } },
          { locations: { $regex: queryText, $options: "i" } },
          { benefits: { $regex: queryText, $options: "i" } },
          { schedule: { $regex: queryText, $options: "i" } },
          { salary: { $regex: queryText, $options: "i" } },
        ],
      };

      let jobs = [];
      // Use aggregation to join with companies and project companyName
      const baseJobs = await jobsCollection.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const appliedJobsResult = await applicationsCollection
            .find({
              user_id: ObjectId.createFromHexString(decoded.id)
            })
            .project({ job_id: 1, _id: 0 })
            .toArray();

          const appliedJobIds = appliedJobsResult.map(app => app.job_id);
          jobs = baseJobs.filter(job =>
            !appliedJobIds.some(appliedId =>
              appliedId.toString() === job._id.toString()
            )
          );
        } catch (error) {
          jobs = baseJobs;
        }
      } else {
        jobs = baseJobs;
      }

      res.status(200).json(jobs);
    } catch (error) {
      res.status(500).json({ error: `Error searching jobs. ${error}` });
    }
  },

  /**
   * Retrieves all jobs with optional search functionality, excluding jobs the applicant has already applied to
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.q] - Search query string
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of matching jobs that the user hasn't applied to
   * @throws {Error} 500 if server error occurs
   */
  getNewJobs: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const applicationsCollection = req.app.locals.db.collection("applications");
      const queryText = req.query.q || "";
      const query = {
        $or: [
          { title: { $regex: queryText, $options: "i" } },
          { jobDescription: { $regex: queryText, $options: "i" } },
          { skills: { $regex: queryText, $options: "i" } },
          { locations: { $regex: queryText, $options: "i" } },
          { benefits: { $regex: queryText, $options: "i" } },
          { schedule: { $regex: queryText, $options: "i" } },
          { salary: { $regex: queryText, $options: "i" } },
        ],
      };

      // Get all jobs matching the search query
      const jobs = await jobsCollection.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      // Get all jobs the user has already applied to
      const appliedJobs = await applicationsCollection
        .find({
          user_id: ObjectId.createFromHexString(req.user.id)
        })
        .project({ job_id: 1, _id: 0 })
        .toArray();

      const appliedJobIds = appliedJobs.map(app => app.job_id.toString());

      // Filter out jobs the user has already applied to
      const newJobs = jobs.filter(job =>
        !appliedJobIds.includes(job._id.toString())
      );

      res.status(200).json(newJobs);
    } catch (error) {
      res.status(500).json({ error: `Error searching new jobs. ${error}` });
    }
  }
};


async function jobsDirectSearch(req) {
  const jobsCollection = req.app.locals.db.collection("Jobs");
  const companiesCollection = req.app.locals.db.collection("companies");
  const queryText = req.query.q || "";

  const query = {
    $or: [
      { title: { $regex: queryText, $options: "i" } },
      { jobDescription: { $regex: queryText, $options: "i" } },
      { skills: { $regex: queryText, $options: "i" } },
      { locations: { $regex: queryText, $options: "i" } },
      { benefits: { $regex: queryText, $options: "i" } },
      { schedule: { $regex: queryText, $options: "i" } },
      { salary: { $regex: queryText, $options: "i" } },
    ],
  };

  const jobs = await jobsCollection.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "companyInfo"
      }
    },
    {
      $unwind: {
        path: "$companyInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        jobDescription: 1,
        skills: 1,
        locations: 1,
        benefits: 1,
        schedule: 1,
        salaryRange: 1,
        createdAt: 1,
        updatedAt: 1,
        employerId: 1,
        companyId: 1,
        companyName: "$companyInfo.name",
        companyWebsite: "$companyInfo.website"
      }
    }
  ]).toArray();
  return jobs;
};

async function jobsSemanticSearch(req) {
  try {
    const searchCriteria = req.query.q || "";
    
    if (!searchCriteria.trim()) {
      throw new Error("Search criteria cannot be empty");
    }

    console.log("🔍 Parsing search criteria:", searchCriteria);
    const jobDetails = await parseSearchCriteria(searchCriteria);
    console.log("📋 Parsed criteria:", jobDetails);

    let processedCriteria = jobDetails.my_requirements || "";

    if (jobDetails.locations?.length > 0) {
      processedCriteria += `\nLocations: ${jobDetails.locations.join(', ')}`;
    }

    if (jobDetails.salaryRange?.minimum || jobDetails.salaryRange?.maximum) {
      const min = jobDetails.salaryRange.minimum || 'Not specified';
      const max = jobDetails.salaryRange.maximum || 'Not specified';
      processedCriteria += `\nSalary: ${min} - ${max}`;
    }

    if (jobDetails.skills?.length > 0) {
      processedCriteria += `\nSkills: ${jobDetails.skills.join(', ')}`;
    }

    if (jobDetails.company) {
      processedCriteria += `\nCompany: ${jobDetails.company}`;
    }

    // Use original search if no structured criteria found
    if (!processedCriteria.trim()) {
      processedCriteria = searchCriteria;
    }

    console.log("🎯 Final search criteria:", processedCriteria);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbeddings(processedCriteria);
    console.log("✅ Generated query embedding");

    // Perform vector search with error handling
    const results = await req.app.locals.db.collection("Jobs").aggregate([
      {
        $vectorSearch: {
          queryVector: queryEmbedding,
          path: "embedding",
          numCandidates: 150, // Increased for better recall
          limit: 30, // Reduced for faster processing
          index: "js_vector_index",
        }
      },
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "companyInfo"
        }
      },
      {
        $unwind: {
          path: "$companyInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          companyName: "$companyInfo.name",
          companyWebsite: "$companyInfo.website",
          jobDescription: 1,
          salaryRange: 1,
          locations: 1,
          benefits: 1,
          schedule: 1,
          skills: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]).toArray();

    console.log(`📊 Vector search returned ${results.length} results`);

    // Filter results with improved threshold
    const filteredResults = results.filter(result => result.score > 0.65);
    console.log(`🎯 Filtered to ${filteredResults.length} high-quality matches`);

    if (filteredResults.length === 0) {
      console.log("⚠️ No high-quality matches found, returning top vector results");
      return results.slice(0, 10); // Return top 10 even if scores are lower
    }

    // Only refine if we have a reasonable number of results
    if (filteredResults.length <= 15) {
      console.log("🔍 Refining matches with AI analysis...");
      const enhancedJobs = await refineFoundPositions(filteredResults, searchCriteria);
      
      // Filter and sort to show "great" and "good" matches
      const qualityMatches = enhancedJobs
        .filter(job => job.match === "great" || job.match === "good")
        .sort((a, b) => {
          if (a.match === "great" && b.match !== "great") return -1;
          if (b.match === "great" && a.match !== "great") return 1;
          return b.score - a.score; // Sort by vector score within same match level
        });

      console.log(`✅ Final refined matches: ${qualityMatches.length}`);
      return qualityMatches;
    } else {
      console.log("📈 Too many results for AI refinement, returning vector matches");
      return filteredResults;
    }

  } catch (error) {
    console.error("❌ Error in jobsSemanticSearch:", error);
    throw error;
  }
};


module.exports = jobsController;