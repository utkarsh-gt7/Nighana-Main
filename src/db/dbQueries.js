import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const connection = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});


connection.connect();






const createCartTableQuery = `
    CREATE TABLE IF NOT EXISTS cart_tb (
        r_id BIGINT NOT NULL,
        d_id BIGINT NOT NULL,
        c_email VARCHAR(50) NOT NULL,
        d_cost INT NOT NULL,
        cart_quantity INT DEFAULT 1,
        d_name VARCHAR(50) NOT NULL,
        cart_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (r_id, d_id, c_email)
    )
`;

const createCustomerLoginTableQuery = `
    CREATE TABLE IF NOT EXISTS customerlogin_tb (
        c_id SERIAL PRIMARY KEY,
        c_name VARCHAR(60) NOT NULL,
        c_phone BIGINT NOT NULL,
        c_preference VARCHAR(10) NOT NULL,
        c_address VARCHAR(100) NOT NULL,
        c_email VARCHAR(50) NOT NULL UNIQUE,
        c_password VARCHAR(100) NOT NULL,
        c_image VARCHAR(100) NOT NULL
    )
`;

const createDishesTableQuery = `
    CREATE TABLE IF NOT EXISTS dishes_tb (
        d_id SERIAL PRIMARY KEY,
        rest_id INT NOT NULL,
        d_name VARCHAR(100) NOT NULL,
        d_cost BIGINT NOT NULL,
        d_type TEXT NOT NULL,
        d_image VARCHAR(200) NOT NULL,
        d_totalRatings INT DEFAULT 0,
        d_totalCustomers INT DEFAULT 0,
        FOREIGN KEY (rest_id) REFERENCES restaurantlogin_tb (rest_id)
    )
`;

// Define the custom enumeration type
const createEnumTypeQuery = `
    CREATE TYPE order_status AS ENUM ('Order Confirmation', 'Preparing food', 'On its way', 'Delivered', 'Canceled');
`;

// Table creation query using the custom enumeration type
const createOrderTableQuery = `
    CREATE TABLE IF NOT EXISTS order_tb (
        od_id SERIAL PRIMARY KEY,
        o_id VARCHAR(100) NOT NULL,
        d_id INT NOT NULL,
        d_name VARCHAR(100) NOT NULL,
        d_quantity INT NOT NULL,
        r_id INT NOT NULL,
        o_status order_status DEFAULT 'Order Confirmation',
        o_payment NUMERIC(10, 2)  NOT NULL,
        c_email VARCHAR(50) NOT NULL,
        c_address VARCHAR(500) NOT NULL,
        c_latitude VARCHAR(30),
        c_longitude VARCHAR(30),
        o_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;


const createRatingTableQuery = `
    CREATE TABLE IF NOT EXISTS rating_tb (
        c_email VARCHAR(50) NOT NULL,
        rest_id INT NOT NULL,
        d_id INT NOT NULL,
        rating INT NOT NULL,
        review TEXT NOT NULL,
        rating_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (c_email, d_id)
    )
`;

const createRestaurantLoginTableQuery = `
    CREATE TABLE IF NOT EXISTS restaurantlogin_tb (
        rest_id SERIAL PRIMARY KEY,
        r_name VARCHAR(50) NOT NULL,
        r_address VARCHAR(500) NOT NULL,
        
        r_email VARCHAR(50) NOT NULL UNIQUE,
        r_password VARCHAR(100) NOT NULL,
        r_image VARCHAR(100) NOT NULL,
        r_city VARCHAR(100) NOT NULL
    )
`;

const queries = [
    createCartTableQuery,
    createCustomerLoginTableQuery,
    createDishesTableQuery,
    createOrderTableQuery,
    createRatingTableQuery,
    createRestaurantLoginTableQuery
];

queries.forEach(query => {
    connection.query(query, (err, res) => {
        if (err) {
            console.error("Error executing query:", err);
        } else {
            console.log("Table created successfully");
        }
    });
});


const getAllDishes = (callback) => {
    try {
        console.log("InsideG");
        connection.query(`SELECT dishes_tb.d_id,
        dishes_tb.rest_id,
        dishes_tb.d_name,
        dishes_tb.d_cost,
        dishes_tb.d_type,
        dishes_tb.d_image,
        dishes_tb.d_totalRatings,
        dishes_tb.d_totalCustomers,
        restaurantlogin_tb.r_name
        FROM dishes_tb
        LEFT JOIN restaurantlogin_tb
        ON dishes_tb.rest_id = restaurantlogin_tb.rest_id`, (error, results, fields) => {
            if(error) {
                callback(error)
            }
            const result = []
            console.log(results);
            results.rows.forEach(dish => {
                result.push({
                    d_id : dish.d_id,
                    rest_id : dish.rest_id,
                    r_name : dish.r_name,
                    d_name : dish.d_name,
                    d_cost : dish.d_cost,
                    d_type : dish.d_type,
                    d_image : dish.d_image,
                    d_rating : dish.d_totalCustomers !== 0 ? parseFloat((dish.d_totalRatings * 5)/(dish.d_totalCustomers * 5)) : 0,
                    d_totalReviews: dish.d_totalCustomers
                })
            });
            callback(result);
        })
    }
    catch(e) {
        callback(e);
    }
}

const getAllRestaurants = (callback) => {
    try {
        connection.query('SELECT rest_id, r_image, r_name, r_address, r_city from restaurantlogin_tb', (error, results, fields) => {
            if(error) {
                callback(error)
            }
            callback(null, results);
        })
    }
    catch(e) {
        callback(e);
    }
}

const addCustomer = (data, callback) => {
    const sql = `
        INSERT INTO customerlogin_tb("c_name", "c_phone", "c_preference", "c_address", "c_email", "c_password", "c_image") 
        VALUES($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [data.name, data.phone, data.preference, data.address, data.email, data.password, data.image];
    
    connection.query(sql, values, (error, results) => {
        if (error) {
            callback(error);
        } else {
            callback(null, results);
        }
    });
};

const addRestaurant = (data, callback) => {
    try {
        const sql = `
            INSERT INTO restaurantlogin_tb("r_name", "r_address", "r_email", "r_password", "r_image", "r_city") 
            VALUES($1, $2, $3, $4, $5, $6)
        `;

        const values = [data.name, data.address, data.email, data.password, data.image, data.city];
        console.log(data);
        connection.query(sql, values, (error, results) => {
            if (error) {
                console.log("InsideE");
                console.log(error);
                callback(error);
            } else {
                console.log(results.rows);
                callback(null, results);
            }
        });
    } catch (e) {
        callback(e);
    }
};


const getUserDetails = (username, flag, callback) => {
    try {
        const sqlCustomer = `
            SELECT c_id, c_email, c_password, c_name, c_image, c_address, c_phone 
            FROM customerlogin_tb 
            WHERE c_email = $1 
            LIMIT 1`;
        
        const sqlRestaurant = `
            SELECT rest_id, r_email, r_password, r_name, r_image, r_address
            FROM restaurantlogin_tb 
            WHERE r_email = $1 
            LIMIT 1`;
        // console.log(flag);
        const sql = flag === "customer" ? sqlCustomer : sqlRestaurant;
        // console.log(username);
        connection.query(sql, [username], (error, results) => {
            if (error) {
                return callback(error);
            }
            if (results.length === 0) {
                return callback(null);
            }
            const user = results.rows[0];
            // console.log(user);
            if (flag === "customer") {
                callback({
                    id: user.c_id,
                    name: user.c_name,
                    email: user.c_email,
                    password: user.c_password,
                    image: user.c_image || "/image-not-available.jpg",
                    type: "customer",
                    address: user.c_address,
                    phone: user.c_phone
                });
            } else {
                callback({
                    id: user.rest_id,
                    name: user.r_name,
                    email: user.r_email,
                    password: user.r_password,
                    image: user.r_image || "/image-not-available.jpg",
                    address: user.r_address,
                    latitude: user.r_latitude,
                    longitude: user.r_longitude,
                    type: "restaurant"
                });
            }
        });
    } catch (e) {
        callback(e);
    }
}


const updatePassword = (data, callback) => {
    const sqlSelect = data.type === 'restaurant' ? 
        `SELECT r_password FROM restaurantlogin_tb WHERE r_email = $1` : 
        `SELECT c_password FROM customerlogin_tb WHERE c_email = $1`;
    
    const sqlUpdate = data.type === 'restaurant' ? 
        `UPDATE restaurantlogin_tb SET r_password = $1 WHERE r_email = $2` : 
        `UPDATE customerlogin_tb SET c_password = $1 WHERE c_email = $2`;

    connection.query(sqlSelect, [data.email], (err, results) => {
        if (err) {
            return callback({ message: "failure" });
        }

        const passwordField = data.type === 'restaurant' ? 'r_password' : 'c_password';
        if (bcrypt.compareSync(data.opassword, results[0][passwordField])) {
            connection.query(sqlUpdate, [data.npassword, data.email], (error, results) => {
                if (error) {
                    return callback({ message: "failure" });
                }
                callback({ message: results.rowCount > 0 ? "success" : "failure" });
            });
        } else {
            callback({ message: "failure" });
        }
    });
}


const resetPassword = (data, callback) => {
    let sql;
    let params;

    if (data.type === 'restaurant') {
        sql = `UPDATE restaurantlogin_tb SET r_password = ? WHERE r_email = ?`;
        params = [data.npassword, data.email];
    } else {
        sql = `UPDATE customerlogin_tb SET c_password = ? WHERE c_email = ?`;
        params = [data.npassword, data.email];
    }

    connection.query(sql, params, (error, results) => {
        if (error) {
            return callback({ message: "failure" });
        }
        if (results.changedRows > 0) {
            return callback({ message: "success" });
        } else {
            return callback({ message: "failure" });
        }
    });
};


const allDishes = (r_id, callback) => {
    const sql = `SELECT * FROM dishes_tb WHERE rest_id = $1`;
    connection.query(sql, [r_id], (err, results) => {
        if (err) {
            return callback(err);
        }
        console.log("INsideGA");
        const dishes = results.rows.map(element => ({
            d_id: element.d_id,
            rest_id: element.rest_id,
            name: element.d_name,
            cost: element.d_cost,
            type: element.d_type,
            image: element.d_image,
            totalReviews: element.d_totalCustomers,
            rating: (element.d_totalRatings * 5) / (element.d_totalCustomers * 5)
        }));
        callback(dishes);
    });
}


const getDish = (d_id, callback) => {
    const sql = `SELECT * FROM dishes_tb WHERE d_id = $1`;
    connection.query(sql, [d_id], (err, results) => {
        if (err) {
            return callback(err);
        }
        if (results.length === 0) {
            return callback(null);
        }
        const dish = results.rows[0];
        callback({
            d_id: dish.d_id,
            d_name: dish.d_name,
            d_cost: dish.d_cost,
            d_type: dish.d_type,
            d_image: dish.d_image
        });
    });
}


const addDish = (data, callback) => {
    const sql = data.d_image ? 
        `INSERT INTO dishes_tb(rest_id, d_name, d_cost, d_type, d_image) VALUES ($1, $2, $3, $4, $5)` : 
        `INSERT INTO dishes_tb(rest_id, d_name, d_cost, d_type) VALUES ($1, $2, $3, $4)`;

    const values = data.d_image ? 
        [data.rest_id, data.d_name, data.d_cost, data.d_type, data.d_image] : 
        [data.rest_id, data.d_name, data.d_cost, data.d_type];

    connection.query(sql, values, (err, results) => {
        if (err) {
            return callback({ message: false });
        }
        callback({ message: true });
    });
}


const updateDish = (data, callback) => {
    const sql = data.d_image ? 
        `UPDATE dishes_tb SET d_name = $1, d_cost = $2, d_type = $3, d_image = $4 WHERE d_id = $5` : 
        `UPDATE dishes_tb SET d_name = $1, d_cost = $2, d_type = $3 WHERE d_id = $4`;

    const values = data.d_image ? 
        [data.d_name, data.d_cost, data.d_type, data.d_image, data.d_id] : 
        [data.d_name, data.d_cost, data.d_type, data.d_id];

    connection.query(sql, values, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback({ message: true });
    });
}


const deleteDish = (d_id, callback) => {
    const sql = `DELETE FROM dishes_tb WHERE d_id = $1`;
    connection.query(sql, [d_id], (err, results) => {
        if (err) {
            return callback({ message: false });
        }
        callback({ message: true });
    });
}


const updateProfile = (data, flag, callback) => {
    const customerSql = data.c_image ? 
        `UPDATE customerlogin_tb SET c_name = $1, c_address = $2, c_phone = $3, c_image = $4 WHERE c_email = $5` : 
        `UPDATE customerlogin_tb SET c_name = $1, c_address = $2, c_phone = $3 WHERE c_email = $4`;

    const restaurantSql = data.r_image ? 
        `UPDATE restaurantlogin_tb SET r_name = $1, r_address = $2, r_image = $3, r_latitude = $4, r_longitude = $5 WHERE r_email = $6` : 
        `UPDATE restaurantlogin_tb SET r_name = $1, r_address = $2, r_latitude = $3, r_longitude = $4 WHERE r_email = $5`;

    const sql = flag === "customer" ? customerSql : restaurantSql;

    const values = flag === "customer" ? 
        data.c_image ? 
            [data.c_name, data.c_address, data.c_phone, data.c_image, data.c_email] : 
            [data.c_name, data.c_address, data.c_phone, data.c_email] : 
        data.r_image ? 
            [data.r_name, data.r_address, data.r_image, data.r_latitude, data.r_longitude, data.r_email] : 
            [data.r_name, data.r_address, data.r_latitude, data.r_longitude, data.r_email];

    connection.query(sql, values, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback({ message: true });
    });
}


const addToCartDB = (data, callback) => {
    if (data.clearFlag) {
        const sql1 = `DELETE FROM cart_tb WHERE c_email = ?`;
        connection.query(sql1, [data.c_email], (err) => {
            if (err) {
                return callback({ message: "Failure" });
            }
            const sql2 = `INSERT IGNORE INTO cart_tb (r_id, d_id, c_email, d_cost, d_name) VALUES (?, ?, ?, ?, ?)`;
            connection.query(sql2, [data.rest_id, data.d_id, data.c_email, data.d_cost, data.d_name], (err, results) => {
                if (err) {
                    return callback({ message: "Failure" });
                }
                callback({ message: results.affectedRows > 0 ? "Success" : "Present" });
            });
        });
    } else {
        const sql = `INSERT IGNORE INTO cart_tb (r_id, d_id, c_email, d_cost, d_name) VALUES (?, ?, ?, ?, ?)`;
        connection.query(sql, [data.rest_id, data.d_id, data.c_email, data.d_cost, data.d_name], (err, results) => {
            if (err) {
                return callback({ message: "Failure" });
            }
            callback({ message: results.affectedRows > 0 ? "Success" : "Present" });
        });
    }
};

const getRestIdFromCart = (email, callback) => {
    const sql = `SELECT DISTINCT r_id FROM cart_tb WHERE c_email = ?`;
    connection.query(sql, [email], (err, results) => {
        if (err) {
            return callback(undefined);
        }
        callback(results);
    });
};

const getCartDishes = (c_email, callback) => {
    const sql = `SELECT * FROM cart_tb WHERE c_email = ?`;
    connection.query(sql, [c_email], (err, results) => {
        if (err) {
            return callback({ message: "Failure" });
        }
        callback(results);
    });
};

const updateCartQty = (data, callback) => {
    const sql = `UPDATE cart_tb SET cart_quantity = ? WHERE c_email = ? AND d_id = ?`;
    connection.query(sql, [data.qty, data.c_email, data.d_id], (err) => {
        if (err) {
            return callback({ message: "Failure" });
        }
        callback({ message: "Success" });
    });
};


const deleteFromCart = (data, callback) => {
    const sql = `DELETE FROM cart_tb WHERE c_email = ? AND d_id = ?`;
    connection.query(sql, [data.email, data.d_id], (err, results) => {
        if (err) {
            return callback({ message: "Failure" });
        }
        callback({ message: "Success" });
    });
};

const getAllOrders = (data, flag, callback) => {
    let sql;
    if (flag === 'restaurant') {
        sql = `SELECT * FROM order_tb WHERE r_id = $1 ORDER BY o_datetime DESC`;
    } else {
        sql = `
            SELECT order_tb.*, restaurantlogin_tb.r_name, restaurantlogin_tb.r_address 
            FROM order_tb 
            INNER JOIN restaurantlogin_tb 
            ON order_tb.r_id = restaurantlogin_tb.rest_id 
            WHERE c_email = $1
            ORDER BY o_datetime DESC`;
    }
    connection.query(sql, [data], (err, results) => {
        if (err) {
            return callback({ message: 'Failure' });
        }
        callback(results.rows);
    });
};


const addOrder = (data, callback) => {
    const sql = `SELECT * FROM cart_tb WHERE c_email = ?`;
    const oid = uuid.v1();
    connection.query(sql, [data.email], (err, results) => {
        if (err) {
            return callback({ message: "Failed" });
        } else {
            results.forEach((element) => {
                const payment = element.cart_quantity * element.d_cost;
                const address = `${data.address.c_address}, ${data.address.c_city}, ${data.address.c_state}, ${data.address.c_country}, ${data.address.c_postalcode}`;
                const osql = `
                    INSERT INTO order_tb (o_id, d_id, d_name, d_quantity, r_id, o_status, o_payment, c_email, c_address, c_latitude, c_longitude) 
                    VALUES (?, ?, ?, ?, ?, 'Order Confirmation', ?, ?, ?, ?, ?)`;
                connection.query(osql, [oid, element.d_id, element.d_name, element.cart_quantity, element.r_id, payment, element.c_email, address, data.address.c_latitude, data.address.c_longitude], (err) => {
                    if (err) {
                        return callback({ message: 'Failed' });
                    }
                });
            });
            return callback({ message: 'Success', oid });
        }
    });
};

const removeCart = (email, callback) => {
    const sql = `DELETE FROM cart_tb WHERE c_email = ?`;
    connection.query(sql, [email], (err) => {
        if (err) {
            return callback({ message: 'Failed' });
        }
        callback({ message: 'Success' });
    });
};

const searchDishes = (data, callback) => {
    const sql = `SELECT d_name, d_id, d_image FROM dishes_tb WHERE d_name LIKE $1 AND rest_id IN (SELECT rest_id FROM restaurantlogin_tb WHERE r_city = $2) LIMIT 1`;
    connection.query(sql, [`%${data.name}%`, data.city], (err, results) => {
        if (err) {
            return callback([]);
        }
        callback(results.rows);
    });
};

const searchRestaurants = (data, callback) => {
    const sql = `SELECT r_name, rest_id, r_image, r_address FROM restaurantlogin_tb WHERE r_name LIKE $1 AND r_city = $2`;
    connection.query(sql, [`%${data.name}%`, data.city], (err, results) => {
        if (err) {
            return callback([]);
        }
        callback(results.rows);
    });
};

const getRestaurant = (r_id, callback) => {
    const sql = `SELECT r_name, r_address, r_image, r_latitude, r_longitude FROM restaurantlogin_tb WHERE rest_id = ?`;
    connection.query(sql, [r_id], (err, results) => {
        if (err || results.length === 0) {
            // console.log("InsideHEN");
            return callback(null);
        }
        callback(results);
    });
};

const getRestaurantwithFilter = (filter, callback) => {
    let sql = `
        SELECT rest_id, r_name, r_image, r_address 
        FROM restaurantlogin_tb 
        WHERE r_city = ? 
        AND rest_id IN (SELECT rest_id FROM dishes_tb`;
    if (filter.d_name) {
        sql += ` WHERE d_name = ?)`;
    } else {
        sql += `)`;
    }
    connection.query(sql, [filter.city, filter.d_name], (err, results) => {
        if (err || results.length === 0) {
            return callback([]);
        }
        callback(results);
    });
};

const addRestReview = (data, callback) => {
    const sql = `INSERT INTO restaurantreview_tb (rest_id, c_id, review, stars) VALUES (?, ?, ?, ?)`;
    connection.query(sql, [data.rest_id, data.c_id, data.review, data.stars], (err) => {
        if (err) {
            return callback({ message: "Server error" });
        }
        const updateSql = `
            UPDATE restaurantlogin_tb 
            SET r_totalRatings = r_totalRatings + ?, r_totalCustomers = r_totalCustomers + 1 
            WHERE rest_id = ?`;
        connection.query(updateSql, [data.stars, data.rest_id], (err) => {
            if (err) {
                return callback({ message: "Server error" });
            }
            callback({ message: 'Success' });
        });
    });
};

const addDishReview = (data, callback) => {
    const sql = `
        UPDATE dishes_tb 
        SET d_totalRatings = d_totalRatings + ?, d_totalCustomers = d_totalCustomers + 1 
        WHERE rest_id = ? AND d_name = ?`;
    connection.query(sql, [data.stars, data.rest_id, data.d_name], (err) => {
        if (err) {
            return callback({ message: "Server error" });
        }
        callback({ message: 'Success' });
    });
};

const getReviews = (rest_id, callback) => {
    const sql = `
        SELECT t1.review, t1.stars, t1.created_at, t2.c_name, t2.c_image 
        FROM restaurantreview_tb AS t1 
        INNER JOIN customerlogin_tb AS t2 
        ON t1.c_id = t2.c_id 
        WHERE t1.rest_id = ? 
        ORDER BY t1.created_at DESC`;
    connection.query(sql, [rest_id], (err, results) => {
        if (err) {
            return callback([]);
        }
        callback(results);
    });
};


const confirmOrder = (od_id, status, callback) => {
    let sql;
    const newStatus = (status === 'Yes') ? 'Preparing food' : (status === 'No') ? 'Canceled' : status;
    console.log(newStatus);
    sql = `UPDATE order_tb SET o_status = $1 WHERE o_id = $2`;
    connection.query(sql, [newStatus, od_id], (err, results) => {
        if (err) {
            return callback({ message: "Failure" });
        }

        const selectSql = `
            SELECT DISTINCT t1.c_email, t2.c_name, t1.r_id 
            FROM order_tb AS t1 
            LEFT JOIN customerlogin_tb AS t2 
            ON t1.c_email = t2.c_email 
            WHERE t1.o_id = $1`;
        connection.query(selectSql, [od_id], (err, results) => {
            if (err) {
                return callback({ message: "Failure" });
            }
            callback({ message: "Success", data: results.rows[0] });
        });
    });
};


const getOrderDetails = (o_id, callback) => {
    const sql = `
        SELECT t4.*, t5.c_name 
        FROM (
            SELECT t1.*, t2.r_name, t2.r_address, t2.r_image, t2.r_latitude, t2.r_longitude 
            FROM order_tb AS t1 
            LEFT JOIN restaurantlogin_tb AS t2 
            ON t1.r_id = t2.rest_id 
            WHERE o_id = $1
        ) AS t4 
        LEFT JOIN customerlogin_tb AS t5 
        ON t4.c_email = t5.c_email`;

    connection.query(sql, [o_id], (err, results) => {
        if (err) {
            return callback([]);
        }
        callback(results.rows);
    });
};



export {getAllDishes, getAllRestaurants, addCustomer, addRestaurant, getUserDetails, 
    updatePassword, resetPassword, updateProfile, allDishes, addDish, updateDish, deleteDish, getDish, addToCartDB, 
    getCartDishes, updateCartQty, deleteFromCart, addOrder, removeCart, getAllOrders, searchDishes, searchRestaurants, 
    getRestaurant, getRestaurantwithFilter, addRestReview, addDishReview, getReviews, confirmOrder, getOrderDetails, getRestIdFromCart};
