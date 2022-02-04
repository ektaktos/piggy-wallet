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
    fundsTransfer.associate = (model) => {
        fundsTransfer.belongsTo(model.user, { as: 'senderData' }, { foreign_key: 'sender'});
        fundsTransfer.belongsTo(model.user, { as: 'beneficiaryData' }, { foreign_key: 'beneficiary'});
    };
    return fundsTransfer;
  };
  