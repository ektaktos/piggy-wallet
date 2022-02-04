const bcrypt = require('bcrypt');
const models = require('./models/index');

const User = models.user;

exports.seedAdmin = async () => {
  const user = await User.findOne({ where: { id: 1 } });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = bcrypt.hashSync('password', salt);
    const newUser = {
      firstname: 'User',
      lastname: 'Test',
      email: 'test-user@test.com',
      password: hashedPassword,
      phone: '08178456789',
    };
    await User.create(newUser);
  }
};
