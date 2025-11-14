// Import the 'dotenv' package to load environment variables from a .env file
require('dotenv').config();

// Import the Mailjet client
const mj = require('node-mailjet').apiConnect(process.env.MJ_API_KEY, process.env.MJ_PRIVATE_KEY);


// Function to send an email
const sendEmail = async (fromAddress, fromName, toAddress, toName, subject, htmlBody) => {
  console.log('=== EMAIL DEBUG ===');
  console.log('fromAddress:', fromAddress);
  console.log('fromName:', fromName);
  console.log('toAddress:', toAddress);
  console.log('EMAIL_FROM from .env:', process.env.EMAIL_FROM);
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

  } catch (error) {
    console.error(error); 
  }
};

module.exports = {
  sendEmail
};