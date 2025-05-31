require('dotenv').config({ path: './config.env' });
const swaggerAutogen = require("swagger-autogen")();


const doc = {
    info: {
        title: "~Verseify, Blogging API",
        description: "Automatically generated API documentation  ~Verseify",
        version: "1.0.0",
    },
    // host: "verseify-backend-kxtc.onrender.com", // Change this if deploying
    schemes: ["https", "http"],
    basePath: "/api",
}

const outputFile = "./swagger.json"           // The output file
const routes = ["./routes/*.js"]         // Add your route files

swaggerAutogen(outputFile, routes, doc).then(() => {
    console.log("Swagger documentation generated successfully!")
})