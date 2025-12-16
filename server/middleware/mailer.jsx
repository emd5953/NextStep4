
require('dotenv').config();
const mj = require('node-mailjet').apiConnect(process.env.MJ_API_KEY, process.env.MJ_PRIVATE_KEY);

/**
 * Send an email using Mailjet
 * @throws {Error} If email sending fails
 */
const sendEmail = async (fromAddress, fromName, toAddress, toName, subject, htmlBody) => {
  // Validate required parameters
  if (!fromAddress || !toAddress || !subject || !htmlBody) {
    throw new Error('Missing required email parameters');
  }

  // Validate Mailjet credentials
  if (!process.env.MJ_API_KEY || !process.env.MJ_PRIVATE_KEY) {
    throw new Error('Mailjet credentials not configured');
  }

  console.log('=== EMAIL DEBUG ===');
  console.log('fromAddress:', fromAddress);
  console.log('fromName:', fromName);
  console.log('toAddress:', toAddress);
  console.log('toName:', toName);
  console.log('subject:', subject);
  console.log('==================');
  
  try {
    const request = await mj.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: fromAddress,
            Name: fromName,
          },
          To: [
            {
              Email: toAddress,
              Name: toName,
            },
          ],
          Subject: subject,
          HTMLPart: htmlBody,
        },
      ],
    });

    console.log('Email sent successfully:', request.body);
    return request.body;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendEmail
};