/**
 * Off-Topic Detector
 * 
 * Detects when user queries are unrelated to NextStep
 * and should not be answered by the chatbot
 */

class OffTopicDetector {
  constructor() {
    // Define NextStep-related keywords and topics
    this.relevantTopics = [
      // Core features
      'job', 'jobs', 'position', 'role', 'career', 'employment', 'work',
      'apply', 'application', 'applying', 'applied',
      'profile', 'resume', 'cv', 'skills', 'experience',
      'search', 'find', 'browse', 'looking', 'seeking',
      'employer', 'company', 'recruiter', 'hiring',
      'interview', 'offer', 'salary', 'compensation',
      'message', 'messaging', 'contact', 'communicate',
      'swipe', 'match', 'matching',
      'withdraw', 'cancel', 'delete',
      'account', 'login', 'signin', 'signup', 'register',
      'nextstep', 'platform', 'app', 'website', 'site',
      
      // Status and tracking
      'status', 'pending', 'rejected', 'accepted',
      'track', 'tracking', 'progress',
      
      // Common question words (neutral)
      'how', 'what', 'when', 'where', 'why', 'who',
      'can', 'could', 'should', 'would', 'do', 'does'
    ];

    // Define clearly off-topic categories
    this.offTopicCategories = {
      weather: /\b(weather|temperature|rain|snow|sunny|cloudy|forecast|climate)\b/i,
      sports: /\b(football|basketball|baseball|soccer|nfl|nba|mlb|super bowl|world cup|championship|playoffs)\b/i,
      entertainment: /\b(movie|film|tv show|series|actor|actress|celebrity|music|song|album|artist|concert|netflix)\b/i,
      news: /\b(news|headline|breaking|president|election|politics|government|congress)\b/i,
      math: /^[\d\s+\-*/()=.]+$|what('?s| is) \d+[\s+\-*/]\d+|calculate|solve|equation/i,
      jokes: /\b(tell (me )?a joke|make me laugh|something funny)\b/i,
      cooking: /\b(recipe|bake a|cook a|ingredient|prepare a meal|make a dish)\b/i,
      travel: /\b(flight|hotel|vacation|trip to|travel to|destination|tourist|booking)\b/i,
      health: /\b(doctor|medicine|symptom|disease|illness|pain|hurt|diagnosis|treatment)\b/i,
      general_knowledge: /\b(capital of|population of|who invented|when was|history of|who is|what is the meaning of life)\b/i,
      creative_requests: /\b(write (me )?a|tell (me )?a|create a|generate a|make (me )?a)\b.{0,30}\b(poem|story|essay|song)\b/i
    };
  }

  /**
   * Check if a query is off-topic
   * 
   * @param {string} query - User's query
   * @returns {Object} { isOffTopic: boolean, category: string|null, confidence: number }
   */
  detect(query) {
    const lowerQuery = query.toLowerCase().trim();

    // Check for clearly off-topic categories FIRST (highest priority)
    for (const [category, pattern] of Object.entries(this.offTopicCategories)) {
      if (pattern.test(lowerQuery)) {
        return {
          isOffTopic: true,
          category: category,
          confidence: 0.95
        };
      }
    }

    // Check if query contains relevant keywords (excluding common question words)
    const substantiveKeywords = this.relevantTopics.filter(topic => 
      !['how', 'what', 'when', 'where', 'why', 'who', 'can', 'could', 'should', 'would', 'do', 'does'].includes(topic)
    );

    const relevantKeywordCount = substantiveKeywords.filter(topic => 
      new RegExp(`\\b${topic}\\b`, 'i').test(lowerQuery)
    ).length;

    // Very short queries without relevant keywords are likely off-topic
    const wordCount = lowerQuery.split(/\s+/).length;
    if (wordCount <= 5 && relevantKeywordCount === 0) {
      // But exclude common greetings and small talk (handled elsewhere)
      const isGreeting = /^(hi|hello|hey|sup|thanks|thank you|bye|goodbye)$/i.test(lowerQuery);
      const isSmallTalk = /^(hows?|how'?s|how is|whats?|what'?s|what is) (everything|things|it going|up)/i.test(lowerQuery);
      
      if (!isGreeting && !isSmallTalk) {
        return {
          isOffTopic: true,
          category: 'unrelated',
          confidence: 0.7
        };
      }
    }

    // Longer queries without relevant keywords are definitely off-topic
    if (wordCount > 5 && relevantKeywordCount === 0) {
      return {
        isOffTopic: true,
        category: 'unrelated',
        confidence: 0.85
      };
    }

    // Query seems relevant
    return {
      isOffTopic: false,
      category: null,
      confidence: 0.8
    };
  }

  /**
   * Generate appropriate response for off-topic queries
   * 
   * @param {string} category - Off-topic category
   * @returns {string} Polite redirect message
   */
  getRedirectMessage(category) {
    const categoryMessages = {
      weather: "I'm a NextStep assistant focused on helping with job searches and applications. I can't help with weather information, but I'd be happy to help you find job opportunities!",
      sports: "I'm here to help with job searching on NextStep, not sports updates. But I can help you find sports-related jobs if you're interested!",
      entertainment: "I'm focused on helping with job searches and career opportunities on NextStep. I can't help with entertainment questions, but I can help you find jobs in the entertainment industry!",
      news: "I'm a NextStep assistant designed to help with job applications and career searches. For news, you'll want to check a news website. How can I help with your job search?",
      math: "I'm here to help with job searching on NextStep, not math calculations. But I can help you find jobs that use math skills!",
      jokes: "I'm not much of a comedian, but I'm great at helping you find jobs! What kind of position are you looking for?",
      cooking: "I'm focused on helping with job searches on NextStep. I can't help with recipes, but I can help you find culinary jobs if you're interested!",
      travel: "I'm here to help with job searching, not travel planning. But I can help you find remote jobs or positions in specific locations!",
      health: "I'm a job search assistant, not a medical professional. For health concerns, please consult a doctor. How can I help with your career search?",
      general_knowledge: "I'm specialized in helping with NextStep's job search features. For general knowledge questions, try a search engine. What can I help you with regarding jobs?",
      creative_requests: "I'm focused on helping with job searches and applications on NextStep. I can't write creative content, but I can help you craft your job profile or find opportunities!",
      unrelated: "I cannot answer that question. Please ask a question related to NextStep's job search features and how to use the platform."
    };

    return categoryMessages[category] || categoryMessages.unrelated;
  }
}

module.exports = OffTopicDetector;
