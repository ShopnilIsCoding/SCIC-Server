const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o0npkhl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false, // Disable strict mode to allow commands like 'distinct'
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const productCollection = client.db("storeDB").collection("products");

        // Fetch products with pagination, searching, filtering, and sorting
        app.get("/api/products", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const searchTerm = req.query.search || "";
            const brands = req.query.brand ? req.query.brand.split(",") : [];
            const categories = req.query.category ? req.query.category.split(",") : [];
            const priceMin = parseFloat(req.query.priceMin) || 0;
            const priceMax = parseFloat(req.query.priceMax) || Infinity;
            const sortBy = req.query.sortBy || "";

            const skip = (page - 1) * limit;

            try {
                // Build the query object based on search, filter, and price range
                let query = {
                    name: { $regex: searchTerm, $options: "i" },
                    price: { $gte: priceMin, $lte: priceMax },
                };

                if (brands.length) {
                    query.brand = { $in: brands };
                }

                if (categories.length) {
                    query.category = { $in: categories };
                }

                // Sort products based on the sortBy parameter
                let sortOption = {};
                if (sortBy === "priceAsc") sortOption.price = 1;
                if (sortBy === "priceDesc") sortOption.price = -1;
                if (sortBy === "dateAdded") sortOption.createdAt = -1;

                const products = await productCollection
                    .find(query)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                const total = await productCollection.countDocuments(query);
                res.json({ products, total, page, pages: Math.ceil(total / limit) });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch products" });
            }
        });

        // Fetch all products (for testing)
        app.get("/products", async (req, res) => {
            try {
                const products = await productCollection.find().toArray();
                res.json(products);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch products" });
            }
        });

        // Fetch distinct brands for filtering
        app.get("/api/brands", async (req, res) => {
            try {
                const brands = await productCollection.aggregate([
                    { $group: { _id: "$brand" } },
                    { $project: { _id: 0, brand: "$_id" } },
                ]).toArray();
                res.json(brands.map((item) => item.brand));
            } catch (error) {
                console.error("Failed to fetch brands:", error);
                res.status(500).json({ error: "Failed to fetch brands" });
            }
        });

        // Fetch distinct categories for filtering
        app.get("/api/categories", async (req, res) => {
            try {
                const categories = await productCollection.aggregate([
                    { $group: { _id: "$category" } },
                    { $project: { _id: 0, category: "$_id" } },
                ]).toArray();
                res.json(categories.map((item) => item.category));
            } catch (error) {
                console.error("Failed to fetch categories:", error);
                res.status(500).json({ error: "Failed to fetch categories" });
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
