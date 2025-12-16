/**
 * Smart Chat Handler
 * 
 * Routes user queries to appropriate handlers based on intent
 * Similar to professional chatbots (LinkedIn, Facebook, etc.)
 */

const IntentClassifier = require('./intentClassifier.jsx');
const OffTopicDetector = require('./offTopicDetector.jsx');

class SmartChatHandler {
  constructor(db, ragService) {
    this.db = db;
    this.ragService = ragService;
    this.intentClassifier = new IntentClassifier();
    this.offTopicDetector = new OffTopicDetector();
  }

  /**
   * Handle user message intelligently
   * 
   * @param {string} message - User's message
   * @param {string} userId - User ID (if logged in)
   * @param {Array} conversationHistory - Previous messages
   * @returns {Promise<Object>} { response, type, data, actions }
   */
  async handleMessage(message, userId = null, conversationHistory = []) {
    // First, check if the query is off-topic
    const offTopicCheck = this.offTopicDetector.detect(message);
    if (offTopicCheck.isOffTopic && offTopicCheck.confidence > 0.7) {
      console.log(`Off-topic query detected: ${offTopicCheck.category} (confidence: ${offTopicCheck.confidence})`);
      return {
        response: this.offTopicDetector.getRedirectMessage(offTopicCheck.category),
        type: 'off_topic',
        category: offTopicCheck.category,
        actions: [
          { label: 'Browse Jobs', action: 'navigate', target: '/browse-jobs' },
          { label: 'View My Jobs', action: 'navigate', target: '/your-jobs' }
        ]
      };
    }

    // Classify intent
    const intent = this.intentClassifier.classify(message);
    console.log(`Intent detected: ${intent.intent} (confidence: ${intent.confidence})`);

    // Route to appropriate handler
    switch (intent.handler) {
      case 'getUserStatus':
        return await this.handleUserStatus(message, userId);

      case 'executeAction':
        return await this.handleAction(message, userId);

      case 'troubleshoot':
        return await this.handleTroubleshooting(message, userId);

      case 'greeting':
        return this.handleGreeting(userId);

      case 'acknowledgment':
        return this.handleThanks();

      case 'smallTalk':
        return this.handleSmallTalk(message);

      case 'searchDocumentation':
      default:
        return await this.handleDocumentationSearch(message, conversationHistory);
    }
  }

  /**
   * Handle user status queries (e.g., "how am I doing?")
   */
  async handleUserStatus(message, userId) {
    if (!userId) {
      return {
        response: "To see your progress, please log in to your account. Once logged in, you can view your applications, interview status, and job search progress in the 'My Jobs' section.",
        type: 'auth_required',
        actions: [
          { label: 'Log In', action: 'navigate', target: '/login' }
        ]
      };
    }

    try {
      // Get user's applications
      const applicationsCollection = this.db.collection('applications');
      const applications = await applicationsCollection.find({
        user_id: userId
      }).toArray();

      const total = applications.length;
      const pending = applications.filter(app => app.status === 'Pending').length;
      const interviewing = applications.filter(app => app.status === 'Interviewing').length;
      const offered = applications.filter(app => app.status === 'Offered').length;
      const rejected = applications.filter(app => app.status === 'Rejected').length;

      // Generate personalized response
      let response = `Here's your job search progress:\n\n`;
      response += `📊 **Total Applications:** ${total}\n`;
      response += `⏳ **Pending:** ${pending}\n`;
      response += `💼 **Interviewing:** ${interviewing}\n`;
      response += `🎉 **Offers:** ${offered}\n`;
      response += `❌ **Rejected:** ${rejected}\n\n`;

      // Add personalized advice
      if (total === 0) {
        response += `You haven't applied to any jobs yet. Start by browsing jobs on the homepage and swiping right on positions you're interested in!`;
      } else if (interviewing > 0) {
        response += `Great job! You have ${interviewing} interview${interviewing > 1 ? 's' : ''} in progress. Keep preparing and responding promptly to employer messages.`;
      } else if (total < 10) {
        response += `You're off to a good start! Try applying to 10-20 jobs to increase your chances. The more you apply, the better your odds!`;
      } else if (pending > total * 0.8) {
        response += `Most of your applications are still pending. This is normal! Employers typically respond within 1-2 weeks. Keep applying to new positions while you wait.`;
      } else {
        response += `You're making good progress! Keep applying consistently and following up on your applications.`;
      }

      return {
        response,
        type: 'user_data',
        data: {
          total,
          pending,
          interviewing,
          offered,
          rejected
        },
        actions: [
          { label: 'View My Jobs', action: 'navigate', target: '/your-jobs' },
          { label: 'Browse More Jobs', action: 'navigate', target: '/browse-jobs' }
        ]
      };

    } catch (error) {
      console.error('Error fetching user status:', error);
      return {
        response: "I'm having trouble accessing your application data right now. Please try refreshing the page or check the 'My Jobs' section directly.",
        type: 'error'
      };
    }
  }

  /**
   * Handle action requests (e.g., "apply to a job")
   */
  async handleAction(message, userId) {
    // Detect what action they want
    if (/apply/i.test(message)) {
      return {
        response: "To apply to a job:\n\n1. Browse jobs on the homepage or search page\n2. Swipe right on a job you like, or click the 'Apply' button\n3. Your application will be submitted instantly!\n\nWould you like me to show you available jobs?",
        type: 'action_guide',
        actions: [
          { label: 'Browse Jobs', action: 'navigate', target: '/browse-jobs' },
          { label: 'View Homepage', action: 'navigate', target: '/' }
        ]
      };
    }

    if (/withdraw/i.test(message)) {
      return {
        response: "To withdraw an application:\n\n1. Go to 'My Jobs' page\n2. Find the application you want to withdraw\n3. Click the red 'Withdraw' button\n4. Confirm your decision\n\n⚠️ Note: This action cannot be undone, but you can reapply later if you change your mind.",
        type: 'action_guide',
        actions: [
          { label: 'Go to My Jobs', action: 'navigate', target: '/your-jobs' }
        ]
      };
    }

    if (/update|change|edit/i.test(message) && /profile/i.test(message)) {
      return {
        response: "To update your profile:\n\n1. Click 'Profile' in the navigation menu\n2. Edit any information you want to change\n3. Click 'Save Profile' when done\n\nYou can update your name, contact info, location, skills, photo, and resume anytime!",
        type: 'action_guide',
        actions: [
          { label: 'Edit Profile', action: 'navigate', target: '/profile' }
        ]
      };
    }

    // Default action response
    return {
      response: "I can help you with actions like:\n- Applying to jobs\n- Withdrawing applications\n- Updating your profile\n- Messaging employers\n\nWhat would you like to do?",
      type: 'action_menu'
    };
  }

  /**
   * Handle troubleshooting (e.g., "my resume won't upload")
   */
  async handleTroubleshooting(message, userId) {
    let response = "I'm sorry you're experiencing an issue. ";

    // Detect specific problems
    if (/resume.*upload/i.test(message) || /upload.*resume/i.test(message)) {
      response += "If your resume won't upload, try these steps:\n\n";
      response += "1. Make sure your file is PDF, DOC, or DOCX format\n";
      response += "2. Check that the file size is under 10MB\n";
      response += "3. Ensure the file isn't password protected\n";
      response += "4. Try using a different browser\n";
      response += "5. Clear your browser cache and try again\n\n";
      response += "If the problem persists, try uploading a different version of your resume.";
    } else if (/login|log in|sign in/i.test(message)) {
      response += "If you're having trouble logging in:\n\n";
      response += "1. Make sure you're using the correct email and password\n";
      response += "2. Try the 'Forgot Password' link to reset your password\n";
      response += "3. Check if your email is verified (check spam folder)\n";
      response += "4. Clear your browser cookies and try again\n";
      response += "5. Try a different browser";
    } else if (/slow|loading|not working/i.test(message)) {
      response += "If the site is slow or not loading:\n\n";
      response += "1. Refresh the page (Ctrl+R or Cmd+R)\n";
      response += "2. Clear your browser cache\n";
      response += "3. Check your internet connection\n";
      response += "4. Try a different browser\n";
      response += "5. Try again in a few minutes";
    } else {
      response += "Here are some general troubleshooting steps:\n\n";
      response += "1. Refresh the page\n";
      response += "2. Clear your browser cache\n";
      response += "3. Try logging out and back in\n";
      response += "4. Try a different browser\n";
      response += "5. Check your internet connection\n\n";
      response += "If the problem continues, please describe the specific issue you're facing and I'll provide more targeted help.";
    }

    return {
      response,
      type: 'troubleshooting'
    };
  }

  /**
   * Handle greetings
   */
  handleGreeting(userId) {
    const greetings = [
      "Hi! I'm the NextStep assistant. How can I help you today?",
      "Hello! I'm here to help with your job search. What can I do for you?",
      "Hey there! Need help with NextStep? I'm here to assist!",
      "Hi! Welcome to NextStep. What would you like to know?"
    ];

    const response = greetings[Math.floor(Math.random() * greetings.length)];

    return {
      response: response + "\n\nI can help you with:\n- Applying to jobs\n- Tracking your applications\n- Updating your profile\n- Troubleshooting issues\n- Answering questions about NextStep",
      type: 'greeting',
      actions: [
        { label: 'Browse Jobs', action: 'navigate', target: '/browse-jobs' },
        { label: 'View My Jobs', action: 'navigate', target: '/your-jobs' },
        { label: 'Edit Profile', action: 'navigate', target: '/profile' }
      ]
    };
  }

  /**
   * Handle thanks/acknowledgment
   */
  handleThanks() {
    const responses = [
      "You're welcome! Let me know if you need anything else.",
      "Happy to help! Feel free to ask if you have more questions.",
      "Glad I could help! Good luck with your job search!",
      "You're welcome! I'm here if you need more assistance."
    ];

    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      type: 'acknowledgment'
    };
  }

  /**
   * Handle small talk
   */
  handleSmallTalk(message) {
    // Detect specific small talk patterns
    if (/how are you/i.test(message)) {
      return {
        response: "I'm doing great, thanks for asking! I'm here and ready to help you with your job search. How can I assist you today?",
        type: 'small_talk'
      };
    }

    if (/how('?s| is|s) (everything|it going|things)/i.test(message)) {
      const responses = [
        "Everything's going well! I'm here to help you with your job search. What would you like to know?",
        "Things are great! Ready to help you find your next opportunity. What can I do for you?",
        "All good here! I'm ready to assist with your job search. How can I help?",
        "Going well! I'm here to answer questions about NextStep. What would you like to know?"
      ];
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        type: 'small_talk',
        actions: [
          { label: 'Browse Jobs', action: 'navigate', target: '/browse-jobs' },
          { label: 'View My Jobs', action: 'navigate', target: '/your-jobs' }
        ]
      };
    }

    if (/what('s| is) up/i.test(message)) {
      return {
        response: "Not much! Just here to help you with your job search. What can I do for you today?",
        type: 'small_talk'
      };
    }

    // Generic small talk response
    return {
      response: "I'm here to help you with your job search on NextStep! What can I do for you?",
      type: 'small_talk'
    };
  }

  /**
   * Handle documentation search (fallback to RAG)
   */
  async handleDocumentationSearch(message, conversationHistory) {
    try {
      const result = await this.ragService.generateResponse(message, conversationHistory);

      return {
        response: result.response,
        type: 'documentation',
        sources: result.sources
      };
    } catch (error) {
      console.error('Error in documentation search:', error);
      return {
        response: "I'm having trouble finding information about that. Could you rephrase your question or ask about something specific like:\n- How to apply to jobs\n- How to update your profile\n- How to track applications\n- How to message employers",
        type: 'error'
      };
    }
  }
}

module.exports = SmartChatHandler;
