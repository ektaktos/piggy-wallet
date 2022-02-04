module.exports = (sequelize, DataTypes) => {
  const virtualAccount = sequelize.define('virtual_accounts', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    account_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    paranoid: true,
    underscored: true,
  });
  virtualAccount.associate = (model) => {
    virtualAccount.belongsTo(model.user, { foreign_key: 'user_id' });
  };
  return virtualAccount;
};
