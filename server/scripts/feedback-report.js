#!/usr/bin/env node

/**
 * Generate Feedback Report
 * 
 * Analyzes user feedback and generates a comprehensive report
 * 
 * Usage:
 *   node scripts/feedback-report.js [days]
 *   npm run feedback-report
 * 
 * Examples:
 *   node scripts/feedback-report.js 7   # Last 7 days
 *   node scripts/feedback-report.js 30  # Last 30 days
 */

const { MongoClient } = require('mongodb');
const FeedbackAnalyzer = require('../services/feedbackAnalyzer');
require('dotenv').config();

async function main() {
  try {
    const days = parseInt(process.argv[2]) || 7;

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const dbName = process.env.NODE_ENV === 'test' ? 'mydb_test' : 'db2';
    const db = client.db(dbName);

    const analyzer = new FeedbackAnalyzer(db);

    // Generate and print report
    const report = await analyzer.generateReport(days);
    console.log(report);

    // Get detailed stats
    const stats = await analyzer.getStats(days);

    // Recommendations
    console.log('💡 RECOMMENDATIONS:\n');

    if (stats.total === 0) {
      console.log('No feedback data yet. Encourage users to provide feedback!\n');
    } else if (parseFloat(stats.satisfactionRate) < 70) {
      console.log('⚠️  Satisfaction rate is below target (70%)');
      console.log('   Action: Review and improve documentation for negative queries\n');
    } else if (parseFloat(stats.satisfactionRate) < 80) {
      console.log('📈 Satisfaction rate is good but can be improved');
      console.log('   Action: Focus on top negative queries\n');
    } else {
      console.log('✅ Satisfaction rate is excellent!');
      console.log('   Keep monitoring and maintaining documentation quality\n');
    }

    if (stats.topNegativeQueries.length > 0) {
      console.log('🎯 PRIORITY ACTIONS:');
      stats.topNegativeQueries.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i+1}. Add/improve docs for: "${item._id}"`);
      });
      console.log();
    }

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

main();
