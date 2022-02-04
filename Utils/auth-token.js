const jwt = require('jsonwebtoken');
const { secret } = require('../config');

exports.signJWT = (data, time = '1d') => jwt.sign(data, secret, { expiresIn: time });

exports.verifyJWT = (token) => {
  const decode = jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return err;
    }
    return decoded;
  });
  return decode;
};
