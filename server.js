// server.js
const app = require('./app');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });


const ConnectDb = async () => {
    try {
        const res = await mongoose.connect(process.env.DB_URI)
        console.log(`Connected to MongoDB successfully  -->  ${res}`)
    } catch (error) {
        console.log(`Error while connecting to MongoDB  -->  ${error}`)
        process.exit(1); // Fail fast for cold startup clarity
    }
}

mongoose.connection.on('connected', () => { console.log('Connected to DB...') });
mongoose.connection.on('error', (err) => { console.log(`Error in MongoDB connection  -->  ${err}`) });
mongoose.connection.on('disconnected', () => { console.log('MongoDB is disconnected & attempting to reconnect...');
    ConnectDb().catch(err => {
        console.error('DB-Reconnection attempt failed:', err)
    })
});

(async () => {
    await ConnectDb()

    const port = process.env.PORT || 8080                       //Don't set a PORT n.o after hosting.....
    app.listen(port, () => { console.log(`Server started & listening at http://localhost:${port}/`) })
})()