// test.js
require('dotenv').config();
const { sendEmail } = require('./middleware/mailer');

sendEmail(
  'nrndbrma@gmail.com.com',  // fromAddress - MUST be verified in Mailjet
  'Your App Name',                         // fromName
  'recipient@example.com',                 // toAddress - where to send the test
  'Recipient Name',                        // toName
  'Test Email',                            // subject
  '<h1>Test Email</h1><p>This is a test email from Mailjet!</p>' // htmlBody
).then(() => {
  console.log('✓ Email sent successfully!');
  process.exit(0);
}).catch(err => {
  console.error('✗ Error sending email:', err);
  process.exit(1);
});