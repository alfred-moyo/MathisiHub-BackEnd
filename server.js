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
});

// Static file middleware
const imagePath = path.resolve(process.cwd(), 'images');
app.use('/images', express.static(imagePath, { fallthrough: true }));

// Handle 404 for missing images
app.use('/images', (req, res) => {
    console.log(`Image not found: ${req.originalUrl}`);
});

// Database instance
let db;
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

// Fetch all lessons
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
        console.log('Showing lessons');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch lessons' });
    }
});

// Create a new order
app.post('/order', async (req, res) => {
    try {
        const order = req.body;
        const result = await db.collection('orders').insertOne(order);
        res.json(result);
        console.log('Order created');
    } catch (err) {
        console.error(err);
    }
});

// Search endpoint
app.get('/search', async (req, res) => {
    try {
        const searchQuery = req.query.word;
        if (!searchQuery) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const database = client.db('Mathisi-Hub');
        const collection = database.collection('lessons');

        let query = {};

        if (!isNaN(searchQuery)) {
            const numberAsString = searchQuery.toString();
            query = {
                $or: [
                    { $expr: { $regexMatch: { input: { $toString: "$price" }, regex: numberAsString, options: "i" } } }
                ]
            };
        } else {
            query = {
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } }
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

app.use((req, res, next) => {
    console.log('Incoming Request:');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    next();
});

// Update lesson endpoint
// Update lesson endpoint
app.put('/lessons/:id', async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);  // Convert to number since id is numeric
        console.log('Received lessonId:', lessonId);

        const updates = req.body;
        console.log('Received updates:', updates);

        // Perform the update operation using the numeric id field
        const result = await db.collection('lessons').updateOne(
            { id: lessonId },  // Use id instead of _id
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            console.log('No lesson matched the query.');
            return res.status(404).json({ error: 'Lesson not found' });
        }

        // Fetch and return the updated document
        const updatedLesson = await db.collection('lessons').findOne(
            { id: lessonId }
        );

        res.status(200).json(updatedLesson);

    } catch (err) {
        console.error('Error updating lesson:', err);
        res.status(500).json({ error: 'Failed to update lesson' });
    }
});


// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable for the port or default to 3000
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
}).catch(console.err);
