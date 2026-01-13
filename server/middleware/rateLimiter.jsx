/**
 * Simple rate limiter for external API calls
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this key
    let userRequests = this.requests.get(key) || [];
    
    // Filter out old requests
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if under limit
    if (userRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    userRequests.push(now);
    this.requests.set(key, userRequests);
    
    return true;
  }

  getRemainingRequests(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const userRequests = (this.requests.get(key) || [])
      .filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - userRequests.length);
  }
}

// Create rate limiter for JSearch API
const jsearchRateLimiter = new RateLimiter(8, 60000); // 8 requests per minute

const rateLimitMiddleware = (req, res, next) => {
  const clientId = req.ip || 'unknown';
  
  if (!jsearchRateLimiter.isAllowed(clientId)) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      remaining: jsearchRateLimiter.getRemainingRequests(clientId)
    });
  }
  
  next();
};

module.exports = { rateLimitMiddleware, jsearchRateLimiter };