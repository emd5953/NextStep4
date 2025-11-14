/**
 * Main server file for the Next-step application
 * @module server
 * @requires dotenv
 * @requires express
 * @requires mongodb
 * @requires cors
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires multer
 * @requires google-auth-library
 */

require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const { sendEmail } = require('./middleware/mailer');
const path = require('path');
const fs = require('fs');
const analyzePDF = require('./middleware/AnalyzePdf');
const { profileController, upload } = require("./controllers/profileController");

// Import controllers
const authController = require("./controllers/authController");
const jobsController = require("./controllers/jobsController");
const applicationsController = require("./controllers/applicationsController");
const messagesController = require("./controllers/messagesController");
const employerMessagingController = require("./controllers/employerMessagingController");
const companyRoutes = require("./routes/companyRoutes");

// Import middleware
const { verifyToken } = require("./middleware/auth");
const { filterJobContent } = require("./middleware/contentFilter");

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

// Log key environment variables (excluding sensitive data)
console.log("Environment check:", {
   port: process.env.PORT,
   twilioConfigured:
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_PHONE_NUMBER,
   mongoConfigured: !!process.env.MONGODB_URI,
   googleConfigured: !!process.env.GOOGLE_CLIENT_ID,
   env: process.env.NODE_ENV || 'Production.Env',
   mail_key: !!process.env.MJ_API_KEY && 
   !!process.env.MJ_PRIVATE_KEY, 
   bad_words_api_key: !!process.env.BAD_WORDS_API_KEY,
   email_from: !!process.env.EMAIL_FROM,
   server_domain: process.env.SERVER_DOMAIN,
});


// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const uri = process.env.MONGODB_URI;           // e.g. "mongodb+srv://..."
const dbName = process.env.NODE_ENV === 'test' ? "mydb_test" : "db2";                         // or process.env.DB_NAME
const client = new MongoClient(uri);
const PORT = process.env.PORT || 4000;

/**
 * Main entry point for the API server
 */
client
   .connect()
   .then(() => {
      const db = client.db(dbName);
      app.locals.db = db; // Make db available to all routes

      /******************************************
       *        ROUTES DEFINITION START         *
       ******************************************/

      // Create API router for /api prefixed routes
      const apiRouter = express.Router();

      /* ------------------
         Tracks Apply(right-swipe), Skip, and Ignore Jobs
         mode: 1 for apply, 2 for skip, 3 for ignore
      ------------------ */
      // define constants for the swipe modes
      const APPLY = 1;
      const IGNORE = 2;

      apiRouter.post("/jobsTracker", verifyToken, applicationsController.trackApplication);

      /* ------------------
         Sign In
         (Email+Password or Phone+Verification)
      ------------------ */
      apiRouter.post("/signin", authController.signin);

      /* ------------------
         Sign Up (Phone verification optional)
      ------------------ */
      apiRouter.post("/signup", authController.signup);

      /* ------------------
         Email Verification (keep on main app - no /api prefix needed)
      ------------------ */
      app.get("/verified", (req, res) => {
        // Serve the verification page
        res.sendFile(path.join(__dirname, 'public', 'verified.html'));
      });

      app.get("/verify-email", async (req, res) => {
        try {
          const { token } = req.query;
          
          if (!token) {
            return res.status(400).json({ error: "Verification token is required" });
          }
          
          const collection = req.app.locals.db.collection("users");
          
          // Find user with this verification token
          const user = await collection.findOne({ verificationToken: token });
          
          if (!user) {
            return res.status(400).json({ error: "Invalid verification token" });
          }
          
          // Check if token has expired
          if (user.verificationExpires < new Date()) {
            return res.status(400).json({ error: "Verification token has expired" });
          }
          
          // Update user to mark email as verified
          await collection.updateOne(
            { _id: user._id },
            { 
              $set: { 
                emailVerified: true,
                verificationToken: null,
                verificationExpires: null
              } 
            }
          );
          
          // Redirect to the verification success page
          res.redirect('/verified?success=true');
        } catch (error) {
          console.error("Email verification error:", error);
          res.status(500).json({ error: "Failed to verify email" });
        }
      });

      /* ------------------
         Resend Verification Email
      ------------------ */
      apiRouter.post("/resend-verification", authController.resendVerification);

      /* ------------------
         Get Applications (for logged-in user)
      ------------------ */
      apiRouter.get("/applications", verifyToken, applicationsController.getUserApplications);

      /* ------------------
         Get Single Job by ID
      ------------------ */
      apiRouter.get("/jobs/:jobId", jobsController.getJobById);

      /* ------------------
         Browse Jobs
      ------------------ */
      apiRouter.get("/jobs", jobsController.getAllJobs);

      /* ------------------
         Get New Jobs (excluding already applied)
      ------------------ */
      apiRouter.get("/newJobs", verifyToken, jobsController.getNewJobs);

      /* ------------------
         Create New Job Posting
      ------------------ */
      apiRouter.post("/jobs", verifyToken, filterJobContent, jobsController.createJob);

      /* ------------------
        Jobs to show in the homepage
      ------------------ */
      apiRouter.get("/retrieveJobsForHomepage", jobsController.getHomepageJobsUsingSemanticSearch);

      /* ------------------
         Get Profile (for logged-in user)
      ------------------ */
      apiRouter.get("/profile", verifyToken, profileController.getProfile);

      /* ------------------
         Update Profile (for logged-in user)
      ------------------ */
      apiRouter.post("/updateprofile", verifyToken, upload.fields([{ name: "photo" }, { name: "resume" }]), profileController.updateProfile);

      /* ------------------
         Analyze Resume
      ------------------ */
      apiRouter.post("/analyze-resume", verifyToken, upload.single('pdf'), async (req, res) => {
        try {
          if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
          }

          // Create a temporary file path
         /*  const tempFilePath = path.join(__dirname, 'public', 'uploads', `temp-${Date.now()}.pdf`);
          fs.writeFileSync(tempFilePath, req.file.buffer);

          const result = await analyzePDF(tempFilePath); */
          const result = await analyzePDF(req.file.buffer.toString("base64"));
          
          // Clean up the temporary file
          //fs.unlinkSync(tempFilePath);
          
          res.json(result);
        } catch (error) {
          console.error('Error analyzing PDF:', error);
          res.status(500).json({ error: 'Error analyzing PDF', details: error.message });
        }
      });

      /* ------------------
         Logout
      ------------------ */
      apiRouter.get("/logout", authController.logout);

      /* ------------------
         Google OAuth
      ------------------ */
      apiRouter.post("/auth/google", authController.googleAuth);

      /* ------------------
         Get All Users (for messenger)
      ------------------ */
      apiRouter.get("/users", verifyToken, profileController.getAllUsers);

      /* ------------------
         Get Messages
      ------------------ */
      apiRouter.get("/messages", verifyToken, messagesController.getMessages);

      /* ------------------
         Mark Messages as Read
      ------------------ */
      apiRouter.put("/messages/read/:contactId", verifyToken, messagesController.markMessagesAsRead);

      /* ------------------
         Mark Company Messages as Read
      ------------------ */
      apiRouter.put("/messages/read/company/:companyId", verifyToken, messagesController.markCompanyMessagesAsRead);

      /* ------------------
         Send Message
      ------------------ */
      apiRouter.post("/messages", verifyToken, messagesController.sendMessage);

      /* ------------------
         Get Recent Contacts
      ------------------ */
      apiRouter.get("/myRecentContacts", verifyToken, messagesController.getRecentContacts);

      /* ------------------
         Get Recent Employer Contacts
      ------------------ */
      apiRouter.get("/myRecentEmployerContacts", verifyToken, messagesController.getRecentEmployerContacts);

      /* ------------------
         Get Employers from Applications
      ------------------ */
      apiRouter.get("/employersFromApplications", verifyToken, messagesController.getEmployersFromApplications);

      /* ------------------
         Send Message to Company
      ------------------ */
      apiRouter.post("/messages/company", verifyToken, messagesController.sendMessageToCompany);

      /* ------------------
         Employer Messaging Routes
      ------------------ */
      apiRouter.get("/employer/messages", verifyToken, employerMessagingController.getEmployerMessages);
      apiRouter.put("/employer/messages/read/:applicantId", verifyToken, employerMessagingController.markMessagesAsRead);
      apiRouter.get("/employer/recent-applicant-contacts", verifyToken, employerMessagingController.getRecentApplicantContacts);
      apiRouter.get("/employer/applicants", verifyToken, employerMessagingController.getApplicantsFromJobs);
      apiRouter.post("/employer/messages", verifyToken, employerMessagingController.sendMessageToApplicant);

      /* ------------------
         Get Employer's Applications with Details
      ------------------ */
      apiRouter.get("/employer/applications", verifyToken, applicationsController.getEmployerApplications);

      /* ------------------
         Update Application Status
      ------------------ */
      apiRouter.put("/employer/applications/:applicationId", verifyToken, applicationsController.updateApplicationStatus);

      /* ------------------
         Get Application Details
      ------------------ */
      apiRouter.get("/employer/applications/:applicationId", verifyToken, applicationsController.getApplicationDetails);

      /* ------------------
         Get All Applications (unfiltered)
      ------------------ */
      apiRouter.get("/getallappl", verifyToken, applicationsController.getAllApplications);

      apiRouter.get("/userProfile/:userId", profileController.getUserProfile);

      /* ------------------
         Update Job Posting
      ------------------ */
      apiRouter.put("/employer/jobs/:jobId", verifyToken, filterJobContent, jobsController.updateJob);

      /* ------------------
         Delete Job Posting
      ------------------ */
      apiRouter.delete("/employer/jobs/:jobId", verifyToken, jobsController.deleteJob);

      /* ------------------
         Search Employer's Job Postings
      ------------------ */
      apiRouter.get("/employer/jobs/search", verifyToken, jobsController.searchEmployerJobs);

      /* ------------------
         Get Company Profile (mount company routes on API router)
      ------------------ */
      apiRouter.use('/', companyRoutes);

      // Mount all API routes with /api prefix
      app.use('/api', apiRouter);

      /******************************************
       *         ROUTES DEFINITION END          *
       ******************************************/

      // Start the server only if not in test environment
      if (process.env.NODE_ENV !== 'test') {
         app.listen(PORT, (err) => {
            if (err) console.log("Error starting server:", err);
            console.log(`Server listening on PORT ${PORT}`);
         });
      }
   })
   .catch((error) => {
      console.error("Error connecting to MongoDB:", error);
   });

module.exports = app;