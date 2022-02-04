module.exports = (sequelize, DataTypes) => {
  const userBank = sequelize.define('user_bank', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transfer_rcp: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    paranoid: true,
    underscored: true,
  });

  userBank.associate = (model) => {
    userBank.belongsTo(model.user, { foreign_key: 'user_id' });
  };
  return userBank;
};
