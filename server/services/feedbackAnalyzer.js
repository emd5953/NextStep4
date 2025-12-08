/**
 * Feedback Analyzer Service
 * 
 * Analyzes user feedback to automatically improve the RAG system
 * Provides alerts and insights for documentation improvements
 */

class FeedbackAnalyzer {
  constructor(db) {
    this.db = db;
    this.feedbackCollection = db.collection('rag_feedback');
  }

  /**
   * Analyze feedback and trigger alerts if needed
   * 
   * @param {string} query - User's query
   * @param {string} feedback - 'positive' or 'negative'
   */
  async analyzeAndAlert(query, feedback) {
    try {
      // Run all analysis checks
      await Promise.all([
        this._checkRepeatedNegativeFeedback(query, feedback),
        this._checkDailySatisfaction(),
        this._checkQuerySuccessRate(query)
      ]);
    } catch (error) {
      console.error('Error analyzing feedback:', error);
    }
  }

  /**
   * Check if a query is getting repeated negative feedback
   * @private
   */
  async _checkRepeatedNegativeFeedback(query, feedback) {
    if (feedback !== 'negative') return;

    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
    const recentNegative = await this.feedbackCollection.countDocuments({
      query: query,
      feedback: 'negative',
      timestamp: { $gte: sevenDaysAgo }
    });

    if (recentNegative >= 3) {
      console.warn('\n' + '='.repeat(60));
      console.warn('🚨 REPEATED NEGATIVE FEEDBACK ALERT');
      console.warn('='.repeat(60));
      console.warn(`Query: "${query}"`);
      console.warn(`Negative feedback count (7 days): ${recentNegative}`);
      console.warn('\n📝 ACTION NEEDED:');
      console.warn('1. Test this query in the chatbot');
      console.warn('2. Review the response quality');
      console.warn('3. Add or improve documentation');
      console.warn('4. Re-ingest: node scripts/ingest-documents.js ./docs');
      console.warn('='.repeat(60) + '\n');
    }
  }

  /**
   * Check overall satisfaction rate for today
   * @private
   */
  async _checkDailySatisfaction() {
    const todayStart = new Date(new Date().setHours(0,0,0,0));
    
    const totalToday = await this.feedbackCollection.countDocuments({
      timestamp: { $gte: todayStart }
    });

    // Only check if we have enough data
    if (totalToday < 10) return;

    const positiveToday = await this.feedbackCollection.countDocuments({
      feedback: 'positive',
      timestamp: { $gte: todayStart }
    });

    const satisfactionRate = (positiveToday / totalToday * 100);

    if (satisfactionRate < 70) {
      console.warn('\n' + '='.repeat(60));
      console.warn('🚨 LOW SATISFACTION ALERT');
      console.warn('='.repeat(60));
      console.warn(`Today's satisfaction rate: ${satisfactionRate.toFixed(1)}%`);
      console.warn(`Target: 80%+`);
      console.warn(`Feedback count: ${positiveToday}/${totalToday}`);
      console.warn('\n📝 ACTION NEEDED:');
      console.warn('1. Review recent negative feedback');
      console.warn('2. Identify common problem areas');
      console.warn('3. Improve documentation');
      console.warn('='.repeat(60) + '\n');
    } else if (satisfactionRate >= 85) {
      console.log(`\n✅ Great job! Satisfaction rate: ${satisfactionRate.toFixed(1)}% (${positiveToday}/${totalToday})\n`);
    }
  }

  /**
   * Check success rate for similar queries
   * @private
   */
  async _checkQuerySuccessRate(query) {
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    
    // Create fuzzy match for similar queries
    const keyWords = this._extractKeyWords(query);
    if (keyWords.length === 0) return;

    const regex = keyWords.join('|');
    
    const total = await this.feedbackCollection.countDocuments({
      query: { $regex: regex, $options: 'i' },
      timestamp: { $gte: thirtyDaysAgo }
    });

    if (total < 5) return; // Need at least 5 samples

    const positive = await this.feedbackCollection.countDocuments({
      query: { $regex: regex, $options: 'i' },
      feedback: 'positive',
      timestamp: { $gte: thirtyDaysAgo }
    });

    const successRate = (positive / total * 100);

    if (successRate < 60) {
      console.warn('\n' + '='.repeat(60));
      console.warn('⚠️  LOW SUCCESS RATE FOR QUERY TYPE');
      console.warn('='.repeat(60));
      console.warn(`Query: "${query}"`);
      console.warn(`Success rate: ${successRate.toFixed(1)}% (${positive}/${total})`);
      console.warn(`Key words: ${keyWords.join(', ')}`);
      console.warn('\n📝 RECOMMENDATION:');
      console.warn('This type of question consistently gets poor responses.');
      console.warn('Consider adding comprehensive documentation for:');
      keyWords.forEach(word => console.warn(`  - ${word}`));
      console.warn('='.repeat(60) + '\n');
    }
  }

  /**
   * Extract key words from query
   * @private
   */
  _extractKeyWords(query) {
    const stopWords = ['how', 'do', 'i', 'can', 'what', 'is', 'the', 'a', 'an', 'to', 'for', 'my'];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3); // Top 3 key words
  }

  /**
   * Get feedback statistics
   * 
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Statistics object
   */
  async getStats(days = 7) {
    const startDate = new Date(Date.now() - days*24*60*60*1000);

    const [total, positive, negative, topNegative, topPositive] = await Promise.all([
      this.feedbackCollection.countDocuments({ timestamp: { $gte: startDate } }),
      this.feedbackCollection.countDocuments({ 
        feedback: 'positive', 
        timestamp: { $gte: startDate } 
      }),
      this.feedbackCollection.countDocuments({ 
        feedback: 'negative', 
        timestamp: { $gte: startDate } 
      }),
      this.feedbackCollection.aggregate([
        { $match: { feedback: 'negative', timestamp: { $gte: startDate } }},
        { $group: { _id: '$query', count: { $sum: 1 } }},
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray(),
      this.feedbackCollection.aggregate([
        { $match: { feedback: 'positive', timestamp: { $gte: startDate } }},
        { $group: { _id: '$query', count: { $sum: 1 } }},
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray()
    ]);

    return {
      period: `Last ${days} days`,
      total,
      positive,
      negative,
      satisfactionRate: total > 0 ? ((positive / total) * 100).toFixed(1) : 0,
      topNegativeQueries: topNegative,
      topPositiveQueries: topPositive
    };
  }

  /**
   * Generate a feedback report
   * 
   * @param {number} days - Number of days to analyze
   * @returns {Promise<string>} Formatted report
   */
  async generateReport(days = 7) {
    const stats = await this.getStats(days);

    let report = '\n' + '='.repeat(60) + '\n';
    report += `📊 FEEDBACK REPORT - ${stats.period}\n`;
    report += '='.repeat(60) + '\n\n';

    report += `Total Feedback: ${stats.total}\n`;
    report += `✅ Positive: ${stats.positive} (${((stats.positive/stats.total)*100).toFixed(1)}%)\n`;
    report += `❌ Negative: ${stats.negative} (${((stats.negative/stats.total)*100).toFixed(1)}%)\n`;
    report += `📈 Satisfaction Rate: ${stats.satisfactionRate}%\n\n`;

    if (stats.topNegativeQueries.length > 0) {
      report += '🔴 TOP NEGATIVE QUERIES:\n';
      stats.topNegativeQueries.forEach((item, i) => {
        report += `  ${i+1}. "${item._id}" (${item.count} times)\n`;
      });
      report += '\n';
    }

    if (stats.topPositiveQueries.length > 0) {
      report += '🟢 TOP POSITIVE QUERIES:\n';
      stats.topPositiveQueries.forEach((item, i) => {
        report += `  ${i+1}. "${item._id}" (${item.count} times)\n`;
      });
      report += '\n';
    }

    report += '='.repeat(60) + '\n';

    return report;
  }
}

module.exports = FeedbackAnalyzer;
