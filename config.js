require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USERNAME,
  dbPass: process.env.DB_PASSWORD,
  dbHost: process.env.DB_HOST,
  secret: 'Here-we-go-key-secret',
  paystack_secret: process.env.PAYSTACK_SECRET,
  flutterwave_secret: process.env.FLUTTERWAVE_SECRET,
  flutterwave_public: process.env.FLUTTERWAVE_PUBLIC,
  webhook_hash: process.env.FLUTTERWAVE_SECRET_HASH,
};
