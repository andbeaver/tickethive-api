import express from 'express';
import cors from 'cors';
import router from './routes.js';

const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Allow React app to make calls to the API
app.use(cors()); // npm install cors

app.use('/api/concerts', router);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});