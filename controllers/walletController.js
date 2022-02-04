const axios = require('axios');
const crypto = require('crypto');
const Flutterwave = require('flutterwave-node-v3');
const config = require('../config');
const { sendEmail } = require('../Utils/email');

const models = require('../models/index');

const Wallet = models.wallet;
const User = models.user;

exports.fundWallet = async (req, res) => {
  const { id } = req.decoded;
  const { amount, paymentRef } = req.body;
  try {
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(401).json({ status: 'error', error: user, message: 'User not found' });
    }

    const walletData = {
      user_id: id,
      amount,
      payment_ref: paymentRef,
      payment_platform: 'paystack',
      description: 'Wallet Funding',
    };
    await Wallet.create(walletData);
    return res.status(200).json({ message: 'Account Funded' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.flutterwaveWebhook = async (req, res) => {
  const { data } = req.body;
  const hash = req.headers['verif-hash'];
  const secretHash = config.webhook_hash;

  if (hash === secretHash) {
    // Get user id with orderRef returned
    const user = await User.findOne({ where: { trans_ref: data.tx_ref } });
    if (user) {
      const walletData = {
        user_id: user.id,
        amount: data.amount,
        payment_ref: data.flw_ref,
        description: 'Wallet Funding',
        payment_platform: 'flutterwave',
      };
      await Wallet.create(walletData);
    }
  }
  return res.sendStatus(200);
};

exports.initializePaystack = async (req, res) => {
  const url = 'https://api.paystack.co/transaction/initialize';
  const { email, amount } = req.body;
  // Get User Id with email
  const user = await User.findOne({ where: { email } });
  const initData = {
    email,
    amount,
  };
  const response = await axios.post(url,
    initData,
    { headers: { Authorization: `Bearer ${config.paystack_secret}` } });

  const paymentUrl = response.data.data.authorization_url;
  return res.status(200).json({ paymentUrl });
};

exports.paystackWebhook = async (req, res) => {
  const { data } = req.body;
  const secret = config.paystack_secret;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  const secretHash = req.headers['x-paystack-signature'];
  if (hash === secretHash) {
    // Get user id with orderRef returned
    const user = await User.findOne({ where: { email: data.customer.email } });
    if (user) {
      const walletData = {
        user_id: user.id,
        amount,
        payment_ref: paymentRef,
        payment_platform: 'paystack',
        description: 'Wallet Funding',
      };
      // Prevent multiple entries
      const checkReference = await Wallet.findOne({ where: { payment_ref: data.reference } });
      if (!checkReference) {
        await Wallet.create(walletData);
      }
    }
  }
  return res.sendStatus(200);
};

exports.monnifyWebhook = async (req, res) => {
  const data = req.body;

  const { customer } = data;
  // Get user id with orderRef returned
  const user = await User.findOne({ where: { email: customer.email } });
  if (user) {
    const walletData = {
      user_id: user.id,
      amount: Number(data.amountPaid),
      payment_ref: data.transactionReference,
      description: 'Wallet Funding',
      payment_platform: 'Monnify',
    };
    await Wallet.create(walletData);
  }
  return res.sendStatus(200);
};
exports.flutterwaveTransfer = async (bank, accountNumber, amount) => {
  const flw = new Flutterwave(config.flutterwave_public, config.flutterwave_secret);
  try {
    const payload = {
      account_bank: bank,
      account_number: accountNumber,
      amount,
      narration: 'NGN',
      reference: `transfer-${Date.now()}`,
      debit_currency: 'NGN',
    };
    const response = await flw.Transfer(payload);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
};

exports.paystackTransfer = async (amount, recipient) => {
  const url = 'https://api.paystack.co/transfer';
  const data = {
    source: 'balance',
    amount,
    recipient,
  };
  const res = await axios.post(url, data, { headers: { Authorization: config.paystack_secret } });
  return res;
};

exports.verifyPaystack = async (req, res) => {
  const { payRef } = req.params;
  const url = `https://api.paystack.co/transaction/verify/${payRef}`;
  const data = await axios.get(url, { headers: { Authorization: `Bearer ${config.paystack_secret}` } });
  res.json(data);
};