import paypal from 'paypal-rest-sdk';
import { connection } from '../dbQueries.js';

const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY } = process.env;

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': "AfTW_Z1tZWsCQR-wWEeRVd2zhpHRs0jzOVFZQgJ782xw1mK9BNCRNY1-1YQBoSy57pXTjfhjcyPFVwJG",
  'client_secret': "EKmNnw4-okwQLElkiY6cbvW167eKljy1WBv1fq5TPmRG_H5-JsLg2gF3RVEnC0npGCbjQxobmm1Ryhvh"
});

const renderBuyPage = async(req,res)=>{

    try {
        const cart = req.session.cart || [];
        res.render('cart.ejs', { cart });

    } catch (error) {
        console.log(error.message);
    }

}

const payProduct = async(req,res)=>{

    try {
        let total = 0;
        req.session.cart.forEach(item => { total += parseFloat(item.d_cost);});
        total = parseFloat(total).toFixed(2);
        console.log(total);
        const itemsL = req.session.cart.map(item => ({
            name: item.d_name, // Assuming d_name is the name of the item
            sku: item.d_id.toString(), // Assuming d_id is the ID of the item
            price: parseFloat(item.d_cost).toFixed(2), // Convert cost to string with 2 decimal places
            currency: "USD", // Assuming the currency is always USD
            quantity: item.quantity // Assuming quantity is stored in item.quantity
        }));
        console.log(itemsL);
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "https://ni-g-hana-front.onrender.com/success",
                "cancel_url": "https://ni-g-hana-front.onrender.com/cart"
            },
            "transactions": [{
                "item_list": {
                    "items":  itemsL
                },
                "amount": {
                    "currency": "USD",
                    "total": total
                },
                "description": "Hat for the best team ever"
            }]
        };

        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                throw error;
            } else {
                for(let i = 0;i < payment.links.length;i++){
                  if(payment.links[i].rel === 'approval_url'){
                    res.redirect(payment.links[i].href);
                  }
                }
            }
          });

    } catch (error) {
        console.log(error.message);
    }

}

const successPage = async(req,res)=>{

    try {
        let total = 0;
        req.session.cart.forEach(item => { total += parseFloat(item.d_cost);});
        total = parseFloat(total).toFixed(2);
        console.log(total);
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;

        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": total
                }
            }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
            if (error) {
                console.log(error.response);
                throw error;
            } else {
                console.log(JSON.stringify(payment));
                let o_id = payment.id;
        let o_status = payment.state;
        let o_payment = parseFloat(payment.transactions[0].related_resources[0].sale.receivable_amount.value);
        let c_email = payment.payer.payer_info.email;
        let c_address = payment.payer.payer_info.shipping_address;
        let o_datetime = payment.create_time;

        payment.transactions.forEach(transaction => {
            transaction.item_list.items.forEach(item => {
                let d_id = item.sku;
                let d_name = item.name;
                let d_quantity = item.quantity;
                connection.query(`INSERT INTO order_tb (o_id, d_id, d_name, d_quantity, o_payment, c_email, c_address, o_datetime, o_status, r_id) VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,[o_id, d_id, d_name, d_quantity, o_payment, c_email, c_address, o_datetime, 'Order Confirmation', 2] , (err, res) => {
                    if(err){
                        console.log(err);
                    }
                })
            })
                
            }
        )
                req.session.cart = [];
                total = 0;
                res.render('success', {oid: paymentId});
            }
        });

    } catch (error) {
        console.log(error.message);
    }

}

const cancelPage = async(req,res)=>{

    try {

        res.render('index');

    } catch (error) {
        console.log(error.message);
    }

}

export  {
    renderBuyPage,
    payProduct,
    successPage,
    cancelPage
}
