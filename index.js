const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o0npkhl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('storeDB').collection('products');

        // Pagination and Product Fetching Route
        app.get('/api/products', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const searchTerm = req.query.search || '';
            const brand = req.query.brand || '';
            const category = req.query.category || '';
            const priceMin = parseFloat(req.query.priceMin) || 0;
            const priceMax = parseFloat(req.query.priceMax) || Infinity;
            const sortBy = req.query.sortBy || '';

            const skip = (page - 1) * limit;

            try {
                let query = {
                    name: { $regex: searchTerm, $options: 'i' },
                    brand: { $regex: brand, $options: 'i' },
                    category: { $regex: category, $options: 'i' },
                    price: { $gte: priceMin, $lte: priceMax },
                };

                let sortOption = {};
                if (sortBy === 'priceAsc') sortOption.price = 1;
                if (sortBy === 'priceDesc') sortOption.price = -1;
                if (sortBy === 'dateAdded') sortOption.createdAt = -1;

                const products = await productCollection.find(query).sort(sortOption).skip(skip).limit(limit).toArray();
                const total = await productCollection.countDocuments(query);

                res.json({ products, total, page, pages: Math.ceil(total / limit) });
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch products' });
            }
        });

        

    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Product Store server running");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
