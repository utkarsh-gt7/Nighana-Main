import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
// import {initializeStudent} from "./passportConfig.js"
// import { initializeORG } from "./passportConfig1.js";
// import db from "./dbConfig.js";
import gravatar from "gravatar";
// import './auth.js';
import dotenv from 'dotenv';
import path from 'path';
import { connection } from "./dbQueries.js";
import fetch from "node-fetch";
import "dotenv/config";
import paypal from 'paypal-rest-sdk';
import {payment_route as paymentRoute }from './routes/paymentRoute.js';

dotenv.config();  

const PORT = 4000;
const app = express();

app.use(express.static("public"));
app.use(express.static("views"));
app.use(express.static("assets"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // secure should be true in production
  }));
app.use('/',paymentRoute);
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// app.use(express.static(path.join(__dirname, "./views")));
// app.use(express.static(path.join(__dirname, "./public")));
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET 
  });

  var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://return.url",
        "cancel_url": "http://cancel.url"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "item",
                "sku": "item",
                "price": "1.00",
                "currency": "USD",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "USD",
            "total": "1.00"
        },
        "description": "This is the payment description."
    }]
};

paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
        console.log("Create Payment Response");
        console.log(payment);
    }
});

app.get("/", async (req, res) => {
    const dishes = await connection.query(`SELECT * FROM dishes_tb ORDER BY d_id DESC LIMIT 6`); // Assuming `dishes` is your table
    console.log(dishes);

    const starts = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Starters']);
    const mains = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Main Course']);
    const soups = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Soups & Stews']);
    const sides = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Sides']);
    const adds = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Additional Nigerian and Ghanaian Cuisines']);
    const bevs = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Beverages']);
    res.render("index.ejs", {dishes: dishes.rows, starts: starts.rows, mains: mains.rows, soups: soups.rows, sides: sides.rows, adds: adds.rows, bevs: bevs.rows});
})

app.get("/about", (req, res) => {
    res.render("about.ejs");
})

app.get("/blog-single", (req, res) => {
    res.render("blog-single.ejs");
})

app.get("/blog", (req, res) => {
    res.render("blog.ejs");
})

app.get("/contact", (req, res) => {
    res.render("contact.ejs");
})

app.get("/menu", async (req, res) => {
    const dishes = await connection.query(`SELECT * FROM dishes_tb ORDER BY d_id DESC LIMIT 6`); // Assuming `dishes` is your table

    const starts = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Starters']);
    const mains = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Main Course']);
    const soups = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Soups & Stews']);
    const sides = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Sides']);
    const adds = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Additional Nigerian and Ghanaian Cuisines']);
    const bevs = await connection.query('SELECT * FROM dishes_tb WHERE d_type = $1', ['Beverages']);
    res.render("menu.ejs", {dishes: dishes.rows, starts: starts.rows, mains: mains.rows, soups: soups.rows, sides: sides.rows, adds: adds.rows, bevs: bevs.rows});
})

app.post('/order/:id', async (req, res) => {
    const dishId = req.params.id;
    const dish = await connection.query('SELECT * FROM dishes_tb WHERE d_id = $1', [dishId]);
    
    if (dish.rows.length === 0) {
      return res.status(404).send('Dish not found');
    }
  
    if (!req.session.cart) {
      req.session.cart = [];
    }
  
    const cart = req.session.cart;
    const existingItemIndex = cart.findIndex(item => item.id === dishId);
  
    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({ ...dish.rows[0], quantity: 1 });
    }
  
    req.session.cart = cart;
    res.redirect('/cart');
  });

app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart.ejs', { cart });
  });
  
app.get('/cart1', (req, res) => {
    res.render('cart1.ejs');
  });

  app.post('/removeFromCart:id', (req, res) => {
    const { dishId } = req.params.id;
    const cart = req.session.cart || [];

    // Check if the cart exists in the session
    if (req.session.cart) {
        // Find the index of the dish in the cart
        const index = req.session.cart.findIndex(item => item.id === dishId);
        
        // If the dish is found, remove it from the cart
        if (index !== -1) {
            req.session.cart.splice(index, 1);
            res.render('cart.ejs', { cart });
        } else {
            res.send(`Dish with ID ${dishId} not found in the cart.`);
        }
    } else {
        res.send('Cart is empty.');
    }
});

app.get("/services", async (req, res) => {
    const dishes = await connection.query(`SELECT * FROM dishes_tb ORDER BY d_id DESC LIMIT 6`);
    res.render("services.ejs", {dishes: dishes.rows});
})


app.listen(PORT, ()=>{
    console.log("Server running on port 3000.")
})