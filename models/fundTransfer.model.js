module.exports = (sequelize, DataTypes) => {
    const fundsTransfer = sequelize.define('funds_transfer', {
      sender: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      beneficiary: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      narration: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    }, {
      paranoid: true,
      underscored: true,
    });
    return fundsTransfer;
  };
  