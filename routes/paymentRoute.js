import express from 'express';
const payment_route = express();

import bodyParser from 'body-parser';
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended:false }));

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

payment_route.set('view engine','ejs');
payment_route.set('views',path.join(__dirname, '../views'));

import {renderBuyPage,
    payProduct,
    successPage,
    cancelPage} from '../controllers/paymentController.js';

payment_route.get('/cart', renderBuyPage);
payment_route.post('/pay', payProduct);
payment_route.get('/success', successPage);
payment_route.get('/cancel', cancelPage);

export  {payment_route};