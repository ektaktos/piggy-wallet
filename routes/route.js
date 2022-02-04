const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware');

const router = express.Router();

router.get('/getVirtual', authController.getFWVA);

// MONNNIFY
router.get('/account/reserve', userController.reserveAccount);
// router.get('/update-users', authController.updateUsers);
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

router.get('/user/profile', verifyToken, userController.getUser);
router.post('/user/consent', verifyToken, userController.userConsent);
router.post('/profile/update', verifyToken, userController.updateProfile);
router.post('/assessment/add', verifyToken, userController.addAssessment);
router.post('/password/update', verifyToken, userController.updatePassword);
router.post('/bank/add', verifyToken, userController.addBank);


router.get('/wallet', verifyToken, walletController.getWallet);
router.get('/wallet-id/:id', walletController.getWalletById);
router.post('/wallet/fund', verifyToken, walletController.fundWallet);
router.post('/flutterwave-webhook', walletController.flutterwaveWebhook);
router.post('/paystack/initialize', verifyToken, walletController.initializePaystack);
router.post('/paystack-webhook', walletController.paystackWebhook);
router.post('/monnify-webhook', walletController.monnifyWebhook);
router.post('/paystack/verify/:payRef', walletController.verifyPaystack);

router.get('/user/bank', verifyToken, userController.getUserBank);

module.exports = router;
