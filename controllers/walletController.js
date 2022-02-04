const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const { sendEmail } = require('../Utils/email');

const models = require('../models/index');

const fundTransfer = models.fund_transfer;
const Wallet = models.wallet;
const virtualAccount = models.virtual_accounts;
const userBank = models.user_bank;
const User = models.user;

exports.getWallet = async (req, res) => {
  const { id } = req.decoded;

  const { balance } = await exports.walletBalance(id);
  const history = await Wallet.findAll({ where: { user_id: id } });

  return res.status(200).json({ balance, history });
}

exports.walletBalance = async (id) => {
  try {
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(401).json({ status: 'error', error: user, message: 'User not found' });
    }

    const totalBal = await Wallet.findAll({
      where: { user_id: id },
      attributes: ['user_id', [sequelize.fn('sum', sequelize.col('amount')), 'total']],
      raw: true,
      group: ['user_id'],
    });

    let balance = 0;
    if (totalBal.length > 0) {
      balance = totalBal[0].total;
    }

    return { balance };

  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
}

exports.sendFunds = async (req, res) => {
  const { id } = req.decoded;
  const { amount, email } = req.body;
  try {
    const { balance } = await exports.walletBalance(id);

    if (amount > balance) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const beneficiary = await User.findOne({ where: { email } });
    if (!beneficiary) {
      return res.status(400).json({ message: 'Beneficiary not found' });
    }

    const transferData = [
      {
        user_id: id,
        amount: `-${amount}`,
        payment_ref: paymentRef,
        payment_platform: 'paystack',
        description: 'Wallet Funding',
      }, 
      {
        user_id: beneficiary.id,
        amount,
        payment_ref: paymentRef,
        payment_platform: 'paystack',
        description: 'Wallet Funding',
      }
    ];

    await fundTransfer.bulkCreate(transferData);
    return res.status(200).json({ message: 'Funds transfer Successful' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.withdrawFunds = async (req, res) => {
  const { id } = req.decoded;
  const { amount } = req.body;
  try {
    const { balance } = exports.walletBalance(id);
    if (amount > balance) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const userbank = await userBank.findOne({ where: { id } });
    await exports.paystackTransfer(amount, userbank.transfer_rcp);

    return res.status(200).json({ message: 'Withdrawal Successful' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
}

exports.flutterwaveWebhook = async (req, res) => {
  const { data } = req.body;
  const hash = req.headers['verif-hash'];
  const secretHash = config.webhook_hash;

  if (hash === secretHash) {
    // Get user id with orderRef returned
    const user = await virtualAccount.findOne({ where: { transaction_ref: data.tx_ref } });
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
  if (!user) {
    return res.status(401).json({ status: 'error', error: user, message: 'User not found' });
  }
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