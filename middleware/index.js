/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const config = require('../config');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['x-access-token'] || req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, config.secret, (err, decoded) => {
      if (err) { res.status(401).json({ message: 'Authentication error, invalid token' }); }
      req.decoded = decoded;
      next();
    });
  } else {
    res.status(401).json({ message: 'Authentication error, token required' });
  }
};
