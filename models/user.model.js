module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    id: {
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.INTEGER,
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        message: 'Email must be unique.',
        fields: [sequelize.fn('lower', sequelize.col('email'))],
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    paranoid: true,
    underscored: true,
  });

  User.associate = (model) => {
    User.hasOne(model.user_bank);
    User.hasMany(model.wallet);
    // User.hasMany(model.virtual_accounts);
  };

  return User;
};
