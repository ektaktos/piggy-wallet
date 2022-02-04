module.exports = (sequelize, DataTypes) => {
  const monnifyAccount = sequelize.define('virtual_account', {
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
  }, {
    paranoid: true,
    underscored: true,
  });
  return virtualAccount;
};
