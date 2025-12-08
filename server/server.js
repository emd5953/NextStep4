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
const chatRoutes = require("./routes/chatRoutes");
const ragChatRoutes = require("./routes/ragChatRoutes");
const ragChatController = require("./controllers/ragChatController");

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
   geminiConfigured: !!process.env.GEMINI_API_KEY,
});


// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://nextstep4.com',
    'https://www.nextstep4.com',
    'https://next-step4.vercel.app'
  ],
  credentials: true
}));


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
         Health Check Endpoint
      ------------------ */
      apiRouter.get("/health", (req, res) => {
         res.status(200).json({ 
            status: "healthy", 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
         });
      });

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
      apiRouter.get("/auth/verify-email", async (req, res) => {
         try {
            const { token } = req.query;
            
            console.log("=== VERIFICATION DEBUG START ===");
            console.log("1. Token received:", token ? "YES" : "NO");
            
            if (!token) {
               return res.send("ERROR: No verification token provided");
            }
            
            const collection = req.app.locals.db.collection("users");
            const user = await collection.findOne({ verificationToken: token });
            
            console.log("2. User found:", user ? "YES" : "NO");
            
            if (!user) {
               return res.send("ERROR: Invalid verification token");
            }
            
            console.log("3. User email:", user.email);
            console.log("4. emailVerified:", user.emailVerified);
            
            if (user.verificationExpires < new Date()) {
               return res.send("ERROR: Token expired");
            }
            
            // Update user
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
            
            console.log("5. User updated successfully");
            console.log("=== VERIFICATION DEBUG END ===");
            
            // Just send plain text instead of redirecting
            res.send(`
               <h1>SUCCESS!</h1>
               <p>Your email has been verified.</p>
               <p><a href="http://localhost:3000/login">Click here to login</a></p>
            `);
         } catch (error) {
            console.error("ERROR:", error);
            res.send("ERROR: " + error.message);
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
         console.log("=== ANALYZE RESUME DEBUG ===");
         console.log("1. File received:", !!req.file);
         
         if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
         }

         console.log("2. File details:", {
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
         });

         const base64Data = req.file.buffer.toString("base64");
         console.log("3. Base64 length:", base64Data.length);
         
         console.log("4. Calling OpenAI...");
         const result = await analyzePDF(base64Data);
         
         console.log("5. OpenAI result:", result);
         console.log("=== DEBUG END ===");
         
         res.json(result);
      } catch (error) {
         console.error('=== ANALYZE ERROR ===');
         console.error('Error:', error);
         console.error('Stack:', error.stack);
         res.status(500).json({ 
            error: 'Error analyzing PDF', 
            details: error.message 
         });
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

      /* ------------------
         Withdraw Application
      ------------------ */
      apiRouter.delete("/applications/:applicationId", verifyToken, applicationsController.withdrawApplication);

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
      
      apiRouter.use('/chat', chatRoutes);
      apiRouter.use('/rag-chat', ragChatRoutes);
      
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
            
            // Initialize RAG services after server starts (non-blocking)
            ragChatController.initializeRAGServices()
               .then(() => {
                  console.log('✓ RAG chat services initialized successfully');
               })
               .catch((error) => {
                  console.error('✗ Failed to initialize RAG services:', error.message);
                  console.error('  RAG chat will not be available until services are initialized');
               });
         });
      }
   })
   .catch((error) => {
      console.error("Error connecting to MongoDB:", error);
   });

module.exports = app;