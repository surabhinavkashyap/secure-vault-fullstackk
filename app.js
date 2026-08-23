const express = require('express')
require('./db/mongoose')
const Task = require('./models/task')
const User = require('./models/user')
const auth = require('./middleware/auth')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Task app is running')
})


app.post('/users', async (req, res) => {
  const user = new User(req.body)

  try {
    await user.save()
    const token = await user.generateAuthToken()

    res.status(201).send({ user, token })
  } catch (e) {
    res.status(400).send(e)
  }
})

app.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()

    res.send({ user, token })
  } catch (e) {
    res.status(400).send()
  }
})

app.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token
    })
    await req.user.save()

    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

app.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()

    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

app.get('/users/me', auth, async (req, res) => {
  res.send(req.user)
})

app.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body)
  const allowedUpdates = ['name', 'email', 'password', 'age']
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update)
  })

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' })
  }

  try {
    updates.forEach((update) => {
      req.user[update] = req.body[update]
    })
    await req.user.save()

    res.send(req.user)
  } catch (e) {
    res.status(400).send(e)
  }
})

app.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.deleteOne()

    res.send(req.user)
  } catch (e) {
    res.status(500).send()
  }
})

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})

    res.send(users)
  } catch (e) {
    res.status(500).send()
  }
})

app.get('/users/:id', async (req, res) => {
  const _id = req.params.id

  try {
    const user = await User.findById(_id)

    if (!user) {
      return res.status(404).send()
    }

    res.send(user)
  } catch (e) {
    res.status(500).send()
  }
})

app.patch('/users/:id', async (req, res) => {
  const updates = Object.keys(req.body)
  const allowedUpdates = ['name', 'email', 'password', 'age']
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update)
  })

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' })
  }
  
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).send()
    }

    updates.forEach((update) => {
      user[update] = req.body[update]
    })
    await user.save()

    res.send(user)
  } catch (e) {
    res.status(400).send(e)
  }
})

app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).send()
    }

    res.send(user)
  } catch (e) {
    res.status(500).send()
  }
})

app.get('/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.user._id })

    res.send(tasks)
  } catch (e) {
    res.status(500).send()
  }
})

app.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user._id
  })

  try {
    await task.save()

    res.status(201).send(task)
  } catch (e) {
    res.status(400).send(e)
  }
})

app.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id

  try {
    const task = await Task.findOne({ _id, owner: req.user._id })

    if (!task) {
      return res.status(404).send()
    }

    res.send(task)
  } catch (e) {
    res.status(500).send()
  }
})

app.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body)
  const allowedUpdates = ['description', 'completed']
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update)
  })

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' })
  }

  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })

    if (!task) {
      return res.status(404).send()
    }

    updates.forEach((update) => {
      task[update] = req.body[update]
    })
    await task.save()

    res.send(task)
  } catch (e) {
    res.status(400).send(e)
  }
})

app.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

    if (!task) {
      return res.status(404).send()
    }

    res.send(task)
  } catch (e) {
    res.status(500).send()
  }
})

app.listen(port, () => {
  console.log('Server is up on port ' + port)
})
