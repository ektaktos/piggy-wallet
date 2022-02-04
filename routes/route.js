const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware');

const router = express.Router();

router.post('/register', [
  body('firstname').isString().isLength({ min: 3, max: 30 }),
  body('lastname').isString().isLength({ min: 3, max: 30 }),
  body('email').isString(),
  body('password').isString(),
  body('phone').isString(),
], authController.register);
router.post('/login', [
  body('email').isString(),
  body('password').isString(),
], authController.login);
router.post('/password/reset', [body('password').isString()], authController.reset);
router.post('/password/forgot', [body('email').isString()], authController.forgot);

router.post('/bank/add', verifyToken, authController.addBank);

router.get('/wallet', verifyToken, walletController.getWallet);

// Generate Virtual bank account with bvn
router.post('/bvn/add', verifyToken, authController.addBvn);

// Sending Funds to anotehr user using their email
router.post('/funds/transfer', verifyToken, walletController.sendFunds);

// Withdrawing User funds from wallet
router.post('/funds/withdrawal', verifyToken, walletController.withdrawFunds);

// Funding Wallet with Bank Transfer and Card Payment and webhook for confirmation
router.post('/paystack/initialize', verifyToken, walletController.initializePaystack);
router.post('/paystack-webhook', walletController.paystackWebhook);
router.post('/flutterwave-webhook', walletController.flutterwaveWebhook);

module.exports = router;
