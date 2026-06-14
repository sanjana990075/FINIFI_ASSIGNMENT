import dotenv from 'dotenv';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/db.js';
import swaggerSpec from './config/swaggerConfig.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import documentRoutes from './routes/documentRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import { logRequest } from './utils/logger.js';

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(logRequest);

app.get('/', (req, res) => {
  res.send('Three-Way Match Engine API is running');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/documents', documentRoutes);
app.use('/match', matchRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/match', matchRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
