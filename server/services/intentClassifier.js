/**
 * Intent Classifier Service
 * 
 * Classifies user intent to route to appropriate handler
 * Similar to how LinkedIn, Facebook, and other professional chatbots work
 */

class IntentClassifier {
  constructor() {
    // Define intent patterns
    this.intents = {
      // User wants to see their own data
      USER_STATUS: {
        patterns: [
          /how am i doing/i,
          /my progress/i,
          /my status/i,
          /how many (applications|jobs)/i,
          /show my (applications|jobs|profile)/i,
          /what('s| is) my status/i
        ],
        confidence: 0.9,
        handler: 'getUserStatus'
      },

      // User wants to perform an action
      ACTION_REQUEST: {
        patterns: [
          /apply to/i,
          /withdraw (from|my)/i,
          /delete my/i,
          /update my/i,
          /change my/i,
          /upload/i,
          /send (a )?message/i
        ],
        confidence: 0.95,
        handler: 'executeAction'
      },

      // User needs help with a feature
      HOW_TO: {
        patterns: [
          /how (do|can) i/i,
          /how to/i,
          /what('s| is) the (way|process)/i,
          /steps to/i,
          /guide (for|to)/i
        ],
        confidence: 0.8,
        handler: 'searchDocumentation'
      },

      // User has a problem
      TROUBLESHOOTING: {
        patterns: [
          /(not working|broken|error|problem|issue)/i,
          /(can't|cannot|unable to)/i,
          /(won't|will not|doesn't|does not)/i,
          /why (is|isn't|won't)/i
        ],
        confidence: 0.85,
        handler: 'troubleshoot'
      },

      // User wants information
      INFORMATION: {
        patterns: [
          /what (is|are|does)/i,
          /tell me about/i,
          /explain/i,
          /define/i,
          /meaning of/i
        ],
        confidence: 0.7,
        handler: 'searchDocumentation'
      },

      // Greeting
      GREETING: {
        patterns: [
          /^(hi|hello|hey|greetings)/i,
          /good (morning|afternoon|evening)/i
        ],
        confidence: 1.0,
        handler: 'greeting'
      },

      // Gratitude
      THANKS: {
        patterns: [
          /thank(s| you)/i,
          /appreciate/i,
          /helpful/i
        ],
        confidence: 1.0,
        handler: 'acknowledgment'
      },

      // Small talk
      SMALL_TALK: {
        patterns: [
          /^(how are you|how're you|hows you)/i,
          /^what('?s| is) up/i,
          /^how('?s| is|s) (it going|everything|things)/i,
          /^(sup|wassup|what's good|whats good)/i
        ],
        confidence: 0.9,
        handler: 'smallTalk'
      }
    };
  }

  /**
   * Classify user intent from message
   * 
   * @param {string} message - User's message
   * @returns {Object} { intent, confidence, handler, matches }
   */
  classify(message) {
    const results = [];

    // Check each intent
    for (const [intentName, intentConfig] of Object.entries(this.intents)) {
      for (const pattern of intentConfig.patterns) {
        if (pattern.test(message)) {
          results.push({
            intent: intentName,
            confidence: intentConfig.confidence,
            handler: intentConfig.handler,
            pattern: pattern.source
          });
          break; // Found a match for this intent
        }
      }
    }

    // Return highest confidence match
    if (results.length > 0) {
      results.sort((a, b) => b.confidence - a.confidence);
      return results[0];
    }

    // No clear intent - default to documentation search
    return {
      intent: 'UNKNOWN',
      confidence: 0.5,
      handler: 'searchDocumentation',
      pattern: null
    };
  }

  /**
   * Extract entities from message (job titles, locations, etc.)
   * 
   * @param {string} message - User's message
   * @returns {Object} Extracted entities
   */
  extractEntities(message) {
    const entities = {};

    // Extract job-related terms
    const jobMatch = message.match(/\b(software engineer|developer|designer|analyst|manager)\b/i);
    if (jobMatch) {
      entities.jobTitle = jobMatch[0];
    }

    // Extract locations
    const locationMatch = message.match(/\b(remote|in [A-Z][a-z]+|[A-Z][a-z]+, [A-Z]{2})\b/i);
    if (locationMatch) {
      entities.location = locationMatch[0];
    }

    // Extract numbers
    const numberMatch = message.match(/\b(\d+)\b/);
    if (numberMatch) {
      entities.number = parseInt(numberMatch[0]);
    }

    return entities;
  }

  /**
   * Determine if message needs user data
   * 
   * @param {string} message - User's message
   * @returns {boolean}
   */
  needsUserData(message) {
    const userDataKeywords = [
      /\bmy\b/i,
      /\bi\b/i,
      /\bme\b/i,
      /\bmine\b/i
    ];

    return userDataKeywords.some(pattern => pattern.test(message));
  }

  /**
   * Suggest clarifying questions
   * 
   * @param {string} message - User's message
   * @returns {Array} Suggested clarifying questions
   */
  suggestClarification(message) {
    const suggestions = [];

    if (message.length < 10) {
      suggestions.push("Could you provide more details about what you need help with?");
    }

    if (this.needsUserData(message) && message.includes('status')) {
      suggestions.push("Would you like to see your application status or job search progress?");
    }

    if (message.includes('apply') && !message.includes('how')) {
      suggestions.push("Are you asking how to apply, or do you want to apply to a specific job?");
    }

    return suggestions;
  }
}

module.exports = IntentClassifier;
