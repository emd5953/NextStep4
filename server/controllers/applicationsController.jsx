const { ObjectId } = require("mongodb");

const APPLY = 1;
const IGNORE = 2;

/**
 * Controller for handling job application-related operations
 * @namespace applicationsController
 */
const applicationsController = {
  /**
   * Tracks a user's job application action (apply, skip, ignore)
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body._id - Job ID
   * @param {number} req.body.swipeMode - Application mode (1 for apply, 2 for ignore)
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Response with job and user IDs or error message
   * @throws {Error} 404 if job not found
   * @throws {Error} 409 if already applied
   * @throws {Error} 500 if server error occurs
   */
  trackApplication: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const { _id, swipeMode, email, name } = req.body;

      // Check if this is an external job (starts with "ext_")
      const isExternalJob = _id.startsWith('ext_');
      
      // For external jobs, store the ID as a string; for internal jobs, convert to ObjectId
      const jobId = isExternalJob ? _id : ObjectId.createFromHexString(_id);

      const applicationInfo = {
        job_id: jobId,
        user_id: ObjectId.createFromHexString(req.user.id),
        name,
        email,
        date_applied: new Date(),
        status: swipeMode === APPLY ? "Pending" :
          swipeMode === IGNORE ? "Ignored" : "Unknown",
        swipeMode: swipeMode,
        swipeAction: swipeMode === APPLY ? "Applied" :
          swipeMode === IGNORE ? "Ignored" : "Unknown",
        isExternal: isExternalJob
      };
      
      // Check if this user has already applied for this job
      const existingApplication = await applicationsCollection.findOne({
        job_id: jobId,
        user_id: ObjectId.createFromHexString(req.user.id),
        swipeMode: APPLY
      });

      if (existingApplication) {
        return res.status(409).json({
          error:
            "You've already applied for this job. Check your application status in 'My Jobs'.",
        });
      }

      // otherwise proceed to insert the combination
      await applicationsCollection.insertOne(applicationInfo);

      res.status(200).json({
        job_id: _id,
        user_id: req.user.id,
      });
    } catch (err) {
      console.log("trackApplication error", err);
      res.status(500).json({
        error: `Failed to save job application. ${err.message}`,
      });
    }
  },

  /**
   * Retrieves all job applications for the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of applications with job details
   * @throws {Error} 500 if server error occurs
   */
  getUserApplications: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");

      const applicationsWithJobDetails = await applicationsCollection
        .aggregate([
          {
            $match: {
              user_id: ObjectId.createFromHexString(req.user.id),
            },
          },
          {
            $lookup: {
              from: "Jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          { $unwind: "$jobDetails" },
          {
            $lookup: {
              from: "companies",
              localField: "jobDetails.companyId",
              foreignField: "_id",
              as: "companyDetails",
            },
          },
          { $unwind: "$companyDetails" },
          {
            $project: {
              _id: 1,
              job_id: 1,
              user_id: 1,
              date_applied: 1,
              status: 1,
              swipeMode: 1,
              swipeAction: 1,
              name: 1,
              email: 1,
              jobDetails: 1,
              companyDetails: 1
            }
          }
        ])
        .toArray();

      res.status(200).json(applicationsWithJobDetails);
    } catch (error) {
      res.status(500).json({ error: `Error searching applications. ${error.message}` });
    }
  },

  /**
   * Retrieves all applications for jobs posted by the logged-in employer
   * REMOVED - Employer functionality no longer supported
   */

  /**
   * Updates the status of a job application
   * REMOVED - Employer functionality no longer supported
   */

  /**
   * Retrieves detailed information about a specific application
   * REMOVED - Employer functionality no longer supported
   */

  /**
   * Retrieves all applications in the database without filtering
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of all applications with job and user details
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 500 if server error occurs
   */
  getAllApplications: async (req, res) => {
    try {
/*       if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can access this endpoint" });
      }
 */
      const applicationsCollection = req.app.locals.db.collection("applications");

      const allApplications = await applicationsCollection
        .aggregate([
          {
            $lookup: {
              from: "Jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          { $unwind: "$jobDetails" },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          { $unwind: "$userDetails" },
          {
            $lookup: {
              from: "companies",
              localField: "jobDetails.companyId",
              foreignField: "_id",
              as: "companyDetails",
            },
          },
          { $unwind: "$companyDetails" },
          {
            $project: {
              _id: 1,
              job_id: 1,
              user_id: 1,
              date_applied: 1,
              status: 1,
              swipeMode: 1,
              swipeAction: 1,
              name: 1,
              email: 1,
              jobDetails: 1,
              userDetails: 1,
              companyDetails: 1
            }
          }
        ])
        .toArray();

      res.status(200).json(allApplications);
    } catch (error) {
      res.status(500).json({ error: `Error retrieving all applications. ${error.message}` });
    }
  },

  /**
   * Withdraws a user's application from a job
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.applicationId - Application ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message or error response
   * @throws {Error} 404 if application not found
   * @throws {Error} 403 if user is not authorized
   * @throws {Error} 500 if server error occurs
   */
  withdrawApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const applicationsCollection = req.app.locals.db.collection("applications");

      // Find the application and verify ownership
      const application = await applicationsCollection.findOne({
        _id: ObjectId.createFromHexString(applicationId),
        user_id: ObjectId.createFromHexString(req.user.id)
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found or unauthorized" });
      }

      // Delete the application
      const result = await applicationsCollection.deleteOne({
        _id: ObjectId.createFromHexString(applicationId)
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.status(200).json({ message: "Application withdrawn successfully" });
    } catch (error) {
      console.error("Error withdrawing application:", error);
      res.status(500).json({ error: "Failed to withdraw application" });
    }
  },

  autoApply: async (req, res) => {
    try {
      const { job_id, title, companyName, jobUrl, isExternal } = req.body;
      const applicationsCollection = req.app.locals.db.collection("applications");
      const usersCollection = req.app.locals.db.collection("users");

      const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(req.user.id) });
      
      const jobId = isExternal ? job_id : ObjectId.createFromHexString(job_id);

      const existingApplication = await applicationsCollection.findOne({
        job_id: jobId,
        user_id: ObjectId.createFromHexString(req.user.id)
      });

      if (existingApplication) {
        return res.status(409).json({ error: "Already applied to this job" });
      }

      const applicationInfo = {
        job_id: jobId,
        user_id: ObjectId.createFromHexString(req.user.id),
        name: user.full_name || `${user.first_name} ${user.last_name}`,
        email: user.email,
        date_applied: new Date(),
        status: "Auto-Applied",
        swipeMode: APPLY,
        swipeAction: "Auto-Applied",
        isExternal: isExternal,
        autoApplied: true
      };

      await applicationsCollection.insertOne(applicationInfo);

      res.status(200).json({ 
        success: true, 
        message: "Auto-applied successfully",
        application: applicationInfo
      });
    } catch (error) {
      console.error("Auto-apply error:", error);
      res.status(500).json({ error: "Failed to auto-apply" });
    }
  },

  rejectJob: async (req, res) => {
    try {
      const { job_id } = req.body;
      const rejectedJobsCollection = req.app.locals.db.collection("rejectedJobs");

      const rejectionInfo = {
        job_id: job_id,
        user_id: ObjectId.createFromHexString(req.user.id),
        date_rejected: new Date()
      };

      await rejectedJobsCollection.insertOne(rejectionInfo);

      res.status(200).json({ success: true, message: "Job rejected" });
    } catch (error) {
      console.error("Reject job error:", error);
      res.status(500).json({ error: "Failed to reject job" });
    }
  },

  getRejectedJobs: async (req, res) => {
    try {
      const rejectedJobsCollection = req.app.locals.db.collection("rejectedJobs");
      const jobsCollection = req.app.locals.db.collection("Jobs");

      const rejectedJobs = await rejectedJobsCollection
        .aggregate([
          {
            $match: { user_id: ObjectId.createFromHexString(req.user.id) }
          },
          {
            $lookup: {
              from: "Jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails"
            }
          },
          {
            $unwind: {
              path: "$jobDetails",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              _id: 1,
              job_id: 1,
              date_rejected: 1,
              title: { $ifNull: ["$jobDetails.title", "N/A"] },
              companyName: { $ifNull: ["$jobDetails.companyName", "N/A"] },
              salaryRange: { $ifNull: ["$jobDetails.salaryRange", "N/A"] }
            }
          }
        ])
        .toArray();

      res.status(200).json(rejectedJobs);
    } catch (error) {
      console.error("Get rejected jobs error:", error);
      res.status(500).json({ error: "Failed to get rejected jobs" });
    }
  }
};

module.exports = applicationsController; 