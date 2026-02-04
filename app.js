const express = require('express');
const associationRoutes = require('./routes/associations');
const objectRoutes = require('./routes/objects');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/objects', objectRoutes);
app.use('/associations', associationRoutes);
app.use('/', healthRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
