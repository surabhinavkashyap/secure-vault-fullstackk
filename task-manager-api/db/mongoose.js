const mongoose = require('mongoose')

const connectDatabase = () => mongoose.connect(process.env.MONGODB_URL)

module.exports = connectDatabase
