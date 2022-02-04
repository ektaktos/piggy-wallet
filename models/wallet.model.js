module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('wallet', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    payment_platform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_ref: {
      type: DataTypes.STRING,
    },
  }, {
    paranoid: true,
    underscored: true,
  });
  Wallet.associate = (model) => {
    Wallet.belongsTo(model.user, { as: 'user' }, { foreign_key: 'user_id' });
  };

  return Wallet;
};
