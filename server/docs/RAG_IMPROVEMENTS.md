# RAG Chatbot Improvement Plan

## Current State Analysis

### ✅ What's Working Well
- RAG pipeline is properly implemented
- Vector store (ChromaDB) integration works
- Conversation history is maintained
- Source citations are shown
- Semantic search retrieves relevant documents
- Fallback handling for irrelevant queries

### ⚠️ Areas for Improvement
1. Limited documentation coverage
2. No user feedback mechanism
3. Basic prompt engineering
4. No query refinement
5. Limited context awareness
6. No analytics/monitoring

---

## Priority 1: Expand Documentation Coverage ⭐⭐⭐⭐⭐

### Current Problem
Only technical docs are ingested. Users ask about features, but chatbot can't answer.

### Solution
Add comprehensive user-facing documentation:

```bash
server/docs/
├── user-guides/          # NEW
│   ├── how-to-apply-jobs.md
│   ├── how-to-create-profile.md
│   ├── how-to-use-swipe.md
│   ├── how-to-message-employers.md
│   ├── how-to-withdraw-application.md
│   └── how-to-search-jobs.md
├── employer-guides/      # NEW
│   ├── how-to-post-jobs.md
│   ├── how-to-review-applications.md
│   ├── how-to-manage-postings.md
│   └── how-to-message-applicants.md
├── features/             # NEW
│   ├── job-matching-algorithm.md
│   ├── semantic-search.md
│   ├── application-tracking.md
│   └── swipe-interface.md
└── faq.md               # NEW - Already created!
```

### Implementation
```bash
# After adding new docs
cd server
npm run ingest:docs
```

### Expected Impact
- 80% more questions answerable
- Better user experience
- Reduced support tickets

---

## Priority 2: Add User Feedback System ⭐⭐⭐⭐

### Current Problem
No way to know if responses are helpful or accurate.

### Solution
Add thumbs up/down feedback to each bot response.

#### Backend Changes

**1. Create feedback collection:**
```javascript
// server/controllers/ragChatController.js
async function submitFeedback(req, res) {
  try {
    const { messageId, feedback, comment } = req.body;
    
    const feedbackCollection = req.app.locals.db.collection("rag_feedback");
    await feedbackCollection.insertOne({
      messageId,
      feedback, // 'positive' or 'negative'
      comment,
      timestamp: new Date(),
      userId: req.user?.id || 'anonymous'
    });
    
    res.status(200).json({ message: 'Feedback recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record feedback' });
  }
}
```

**2. Add route:**
```javascript
// server/routes/ragChatRoutes.js
router.post('/feedback', submitFeedback);
```

#### Frontend Changes

**Update ChatWidget.js:**
```javascript
// Add feedback buttons to bot messages
{msg.sender === "bot" && (
  <div className="feedback-buttons">
    <button onClick={() => handleFeedback(msg.id, 'positive')}>
      👍 Helpful
    </button>
    <button onClick={() => handleFeedback(msg.id, 'negative')}>
      👎 Not helpful
    </button>
  </div>
)}
```

### Expected Impact
- Identify weak areas in documentation
- Improve response quality over time
- Measure chatbot effectiveness

---

## Priority 3: Improve Prompt Engineering ⭐⭐⭐⭐

### Current Problem
Generic system prompt doesn't leverage full context.

### Solution
Enhanced prompt with better instructions.

**Update ragService.js:**
```javascript
formatPrompt(documents, history, query) {
  let prompt = `You are NextStep AI Assistant, an expert on the NextStep job matching platform.

ROLE & PERSONALITY:
- Friendly, professional, and helpful
- Concise but thorough
- Use examples when helpful
- Guide users to relevant features

INSTRUCTIONS:
1. Answer based ONLY on the provided documentation
2. If information is missing, say so clearly and suggest alternatives
3. For "how-to" questions, provide step-by-step instructions
4. For feature questions, explain benefits and use cases
5. Always be encouraging and supportive

RESPONSE FORMAT:
- Use bullet points for lists
- Use numbered steps for procedures
- Bold important terms
- Keep paragraphs short (2-3 sentences max)

`;

  // Add context...
  if (documents && documents.length > 0) {
    prompt += '=== RELEVANT DOCUMENTATION ===\n\n';
    documents.forEach((doc, index) => {
      prompt += `[Source ${index + 1}: ${doc.metadata.source}]\n`;
      prompt += `${doc.document}\n\n`;
    });
  }

  // Add conversation history...
  if (history && history.length > 0) {
    prompt += '=== CONVERSATION CONTEXT ===\n\n';
    history.forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  prompt += `=== CURRENT QUESTION ===\n${query}\n\n`;
  prompt += `Provide a helpful, accurate answer based on the documentation above:`;

  return prompt;
}
```

### Expected Impact
- More consistent response quality
- Better formatting
- More helpful tone

---

## Priority 4: Add Query Refinement ⭐⭐⭐

### Current Problem
Vague queries like "how do I apply" don't retrieve best documents.

### Solution
Expand query before embedding.

**Add to ragService.js:**
```javascript
async refineQuery(query) {
  // Expand common abbreviations and add context
  const expansions = {
    'apply': 'apply to job application submit',
    'profile': 'profile account settings update',
    'search': 'search jobs find browse discover',
    'message': 'message chat communicate employer',
    'withdraw': 'withdraw cancel remove application',
    'swipe': 'swipe right left apply pass job'
  };

  let refinedQuery = query.toLowerCase();
  
  for (const [key, expansion] of Object.entries(expansions)) {
    if (refinedQuery.includes(key)) {
      refinedQuery += ' ' + expansion;
    }
  }

  return refinedQuery;
}

async generateResponse(query, conversationHistory = []) {
  // Refine query before retrieval
  const refinedQuery = await this.refineQuery(query);
  
  // Use refined query for retrieval
  const documents = await this.retrieveDocuments(refinedQuery, ragConfig.retrievalCount);
  
  // ... rest of the method
}
```

### Expected Impact
- Better document retrieval
- More relevant answers
- Fewer "I don't know" responses

---

## Priority 5: Add Context Awareness ⭐⭐⭐

### Current Problem
Chatbot doesn't know if user is job seeker or employer.

### Solution
Pass user context to chatbot.

**Update frontend:**
```javascript
// src/components/ChatWidget.js
const { employerFlag } = useContext(TokenContext);

const response = await fetch(`${API_URL}/api/rag-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Add auth
  },
  body: JSON.stringify({ 
    message: currentInput,
    userContext: {
      isEmployer: employerFlag,
      hasProfile: true // Check if profile is complete
    }
  }),
});
```

**Update backend:**
```javascript
// server/controllers/ragChatController.js
async function handleChatMessage(req, res) {
  const { message, conversationHistory, userContext } = req.body;
  
  // Pass context to RAG service
  const result = await ragService.generateResponse(
    message, 
    conversationHistory,
    userContext
  );
  
  // ...
}
```

**Update prompt:**
```javascript
formatPrompt(documents, history, query, userContext) {
  let prompt = 'You are NextStep AI Assistant.\n\n';
  
  if (userContext?.isEmployer) {
    prompt += 'USER CONTEXT: This is an employer asking about hiring features.\n';
    prompt += 'Focus on: posting jobs, reviewing applications, messaging candidates.\n\n';
  } else {
    prompt += 'USER CONTEXT: This is a job seeker asking about finding jobs.\n';
    prompt += 'Focus on: searching jobs, applying, tracking applications, profile setup.\n\n';
  }
  
  // ... rest of prompt
}
```

### Expected Impact
- More relevant answers
- Better personalization
- Reduced confusion

---

## Priority 6: Add Analytics Dashboard ⭐⭐

### Current Problem
No visibility into chatbot usage or performance.

### Solution
Track metrics and create admin dashboard.

**Metrics to Track:**
```javascript
// server/models/ragMetrics.js
{
  timestamp: Date,
  query: String,
  responseTime: Number,
  documentsRetrieved: Number,
  topScore: Number,
  hadRelevantDocs: Boolean,
  userFeedback: String, // 'positive', 'negative', null
  userId: String,
  sessionId: String
}
```

**Implementation:**
```javascript
// server/controllers/ragChatController.js
async function handleChatMessage(req, res) {
  const startTime = Date.now();
  
  // ... generate response
  
  const responseTime = Date.now() - startTime;
  
  // Log metrics
  await req.app.locals.db.collection('rag_metrics').insertOne({
    timestamp: new Date(),
    query: message,
    responseTime,
    documentsRetrieved: result.sources.length,
    topScore: result.sources[0]?.score || 0,
    hadRelevantDocs: result.sources.length > 0,
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID
  });
  
  // ...
}
```

### Expected Impact
- Identify common questions
- Find documentation gaps
- Measure performance
- Track improvements

---

## Priority 7: Implement Caching ⭐⭐

### Current Problem
Same questions generate new embeddings and API calls every time.

### Solution
Cache common queries and responses.

**Implementation:**
```javascript
// server/services/cacheService.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

class CacheService {
  getCachedResponse(query) {
    const key = this.generateKey(query);
    return cache.get(key);
  }
  
  cacheResponse(query, response) {
    const key = this.generateKey(query);
    cache.set(key, response);
  }
  
  generateKey(query) {
    return query.toLowerCase().trim().replace(/\s+/g, '_');
  }
}
```

**Update ragService.js:**
```javascript
async generateResponse(query, conversationHistory = []) {
  // Check cache first (only for queries without history)
  if (conversationHistory.length === 0) {
    const cached = this.cacheService.getCachedResponse(query);
    if (cached) {
      console.log('✓ Cache hit');
      return cached;
    }
  }
  
  // Generate response...
  const result = await this.generateResponseInternal(query, conversationHistory);
  
  // Cache if no history
  if (conversationHistory.length === 0) {
    this.cacheService.cacheResponse(query, result);
  }
  
  return result;
}
```

### Expected Impact
- Faster responses for common questions
- Reduced API costs
- Better user experience

---

## Priority 8: Add Suggested Questions ⭐⭐

### Current Problem
Users don't know what to ask.

### Solution
Show suggested questions based on context.

**Update ChatWidget.js:**
```javascript
const suggestedQuestions = [
  "How do I apply to a job?",
  "How does the swipe feature work?",
  "Can I withdraw my application?",
  "How do I update my profile?",
  "How does job matching work?"
];

// Show suggestions when chat opens
{messages.length === 1 && (
  <div className="suggested-questions">
    <p>Try asking:</p>
    {suggestedQuestions.map((q, i) => (
      <button 
        key={i}
        onClick={() => {
          setInput(q);
          handleSubmit({ preventDefault: () => {} });
        }}
        className="suggestion-chip"
      >
        {q}
      </button>
    ))}
  </div>
)}
```

### Expected Impact
- Better user engagement
- More successful interactions
- Showcase chatbot capabilities

---

## Implementation Roadmap

### Week 1: Quick Wins
- ✅ Add FAQ.md (Done!)
- ✅ Add withdrawal guide (Done!)
- [ ] Add user guides (5 docs)
- [ ] Add employer guides (4 docs)
- [ ] Re-ingest documentation

### Week 2: Core Improvements
- [ ] Implement feedback system
- [ ] Improve prompt engineering
- [ ] Add query refinement
- [ ] Test and iterate

### Week 3: Advanced Features
- [ ] Add context awareness
- [ ] Implement caching
- [ ] Add suggested questions
- [ ] Create analytics dashboard

### Week 4: Polish & Monitor
- [ ] Analyze feedback data
- [ ] Refine prompts based on metrics
- [ ] Add more documentation as needed
- [ ] Optimize performance

---

## Measuring Success

### Key Metrics
1. **Response Accuracy:** % of positive feedback
2. **Coverage:** % of questions answered (not "I don't know")
3. **Response Time:** Average time to generate response
4. **User Engagement:** Messages per session
5. **Deflection Rate:** % of support tickets avoided

### Target Goals (3 months)
- 85%+ positive feedback
- 90%+ question coverage
- <2 second response time
- 3+ messages per session
- 50% reduction in support tickets

---

## Next Steps

1. **Immediate:** Add user-facing documentation
2. **This Week:** Implement feedback system
3. **This Month:** Complete all Priority 1-3 improvements
4. **Ongoing:** Monitor metrics and iterate

---

## Resources Needed

- **Time:** ~40 hours total implementation
- **Cost:** None (using existing infrastructure)
- **Dependencies:** 
  - `node-cache` for caching (npm install)
  - MongoDB collection for feedback
  - MongoDB collection for metrics

---


