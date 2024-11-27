const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const PropertiesReader = require('properties-reader');
const path = require('path');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());


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


// Initializing the middleware logger
app.use((req, res, next) => {
    const time = new Date().toISOString();
    console.log(`${req.method} ${req.url} - ${time}`);
    next();
})

// static file middleware

const imagePath = path.resolve(process.cwd(), 'images');
app.use('/images', express.static(imagePath, { fallthrough: true }));

// Handle 404 for missing images
app.use('/images', (req, res) => {
    console.log(`Image not found: ${req.originalUrl}`);
    // res.status(404).json({ error: 'Image not found' });
});


let db; // Database instance
let client;

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

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Hi, Server is running!');
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

app.get('/search', async (req, res) => {
    try {
        const searchQuery = req.query.term; 
        if (!searchQuery) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const database = client.db('Xkool-eShop');
        const collection = database.collection('Programs');

        let query = {};
        

        if (!isNaN(searchQuery)) {
            const numberAsString = searchQuery.toString();
            query = {
                $or: [
                    { $expr: { $regexMatch: {input: { $toString: "$price" }, regex: numberAsString, options: "i" } } }, 
                    { $expr: { $regexMatch: {input: { $toString: "$availableSpaces" }, regex: numberAsString, options: "i" } } }
                ]
            };
        } else {
            query = {
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } }, 
                    { location: { $regex: searchQuery, $options: 'i' } }                 
                ]
            };
        }

        const results = await collection.find(query).toArray();

        res.json(results);
        console.log(`Search successful with query: "${searchQuery}"`);
    } catch (error) {
        res.status(500).json({ error: "Search Failed!" });
        console.error("Error performing search:", error);
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
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
}).catch(console.err);
