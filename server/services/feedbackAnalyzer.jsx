const { unwrap } = require('./supabaseService.js');
class FeedbackAnalyzer {
  constructor(db) { this.db = db; }
  async getStats(days = 7) {
    const since = new Date(Date.now() - Math.min(365, Math.max(1, days)) * 86400000).toISOString();
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const page = unwrap(await this.db.from('rag_feedback').select('id,feedback,query').gte('created_at', since).order('id').range(offset, offset + 999));
      rows.push(...page);
      if (page.length < 1000) break;
    }
    const positive = rows.filter(r => r.feedback === 'positive').length;
    const top = feedback => {
      const counts = new Map();
      for (const row of rows.filter(r => r.feedback === feedback)) counts.set(row.query, (counts.get(row.query) || 0) + 1);
      return [...counts].map(([_id, count]) => ({ _id, count })).sort((a,b) => b.count-a.count).slice(0,5);
    };
    return { period: 'Last ' + days + ' days', total: rows.length, positive, negative: rows.length-positive,
      satisfactionRate: rows.length ? (positive / rows.length * 100).toFixed(1) : 0,
      topNegativeQueries: top('negative'), topPositiveQueries: top('positive') };
  }
  async generateReport(days = 7) { return JSON.stringify(await this.getStats(days), null, 2); }
}
module.exports = FeedbackAnalyzer;
