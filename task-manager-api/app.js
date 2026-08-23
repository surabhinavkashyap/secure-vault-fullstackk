const express = require('express')
const connectDatabase = require('./db/mongoose')
const userRouter = require('./routers/user')
const taskRouter = require('./routers/task')

const app = express()
const port = process.env.PORT || 3000

app.use((req, res, next) => {
  const requestOrigin = req.header('Origin')
  const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ])

  if (allowedOrigins.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())
app.use(userRouter)
app.use(taskRouter)

app.get('/', (req, res) => {
  res.send({ status: 'ok', service: 'TaskFlow API' })
})

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log('Server is up on port ' + port)
    })
  })
  .catch((error) => {
    console.error('Unable to connect to MongoDB:', error.message)
    process.exit(1)
  })
