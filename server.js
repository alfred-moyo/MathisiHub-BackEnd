const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const PropertiesReader = require('properties-reader');

// Load environment variables from properties file
const properties = PropertiesReader('./dbconnection.properties');
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbUser = properties.get('db.user');
const dbName = properties.get('db.name');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

// Construct MongoDB URI
const dbURI = `${dbPrefix}${dbUser}:${dbPassword}@${dbHost}/${dbName}?${dbParams}`;


// Initialize MongoDB client


let db; // Database instance
let client;

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
async function connectDB() {
    try {
        client = new MongoClient(dbURI);
        await client.connect();
        db = client.db(dbName);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1); // Exit the application on a connection error
    }
}

connectDB();

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Hi There, Nqobile!');
});

app.get('/lessons', async (req, res) => {
    try{
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
        console.log('Showing lessons');
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch lessons'});
    }
});

app.post('/order', async (req, res) => {
    try{
        const order = req.body;
        const result = await db.collection('orders').insertOne(order);
        res.json(result);
        console.log('Order created');
    } catch (err) {
        console.error(err);
    }
});

// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable for the port or default to 3000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});