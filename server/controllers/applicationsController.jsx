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


      const applicationInfo = {
        job_id: ObjectId.createFromHexString(_id),
        user_id: ObjectId.createFromHexString(req.user.id),
        name,
        email,
        date_applied: new Date(),
        status: swipeMode === APPLY ? "Pending" :
          swipeMode === IGNORE ? "Ignored" : "Unknown",
        swipeMode: swipeMode,
        swipeAction: swipeMode === APPLY ? "Applied" :
          swipeMode === IGNORE ? "Ignored" : "Unknown"
      };
      // Check if this user has already applied for this job
      const existingApplication = await applicationsCollection.findOne({
        job_id: ObjectId.createFromHexString(_id),
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
  }
};

module.exports = applicationsController; 