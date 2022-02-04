const nodemailer = require('nodemailer');
const config = require('../config');

exports.sendEmail = async (data) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.sendinblue.com',
    port: 587,
    secure: false, // use SSL
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user: config.sendinblu_email,
      pass: config.sendinblu_pass,
    },
  });

  const mailOptions = {
    from: 'Smart Stewards<support@smartstewards.com>',
    to: data.email,
    subject: data.subject,
    html: data.message,
    replyTo: '',
  };
  try {
    const message = await transporter.sendMail(mailOptions);
    return message;
  } catch (error) {
    return `Email not sent, ${error}`;
  }
};
