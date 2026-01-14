/**
 * Performance monitoring middleware for API endpoints
 */

const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log slow requests (over 3 seconds)
    if (responseTime > 3000) {
      console.warn(`⚠️  Slow API response: ${req.method} ${req.path} took ${responseTime}ms`);
    }
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = performanceMonitor;