const express = require('express');
const cors = require('cors');
const db = require('./models/index');
const routes = require('./routes/route');
const config = require('./config');
const { seedAdmin } = require('./seed');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);
app.get('/', (req, res) => {
  res.send('hello world');
});

// Wildcard to match unfound route
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route does not exist' });
});

db.sequelize.sync({}).then(() => {
  console.log('Successfully Connected');
  seedAdmin();
}).catch((err) => {
  console.log(err);
});
app.set('port', config.port || 3000);
app.listen(config.port, () => {
  console.log(`Listening on ${config.port}`);
});

module.exports = app;
