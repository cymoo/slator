const path = require('path')
const express = require('express')

const host = '0.0.0.0'
const port = 3001

const app = express()

app.use('/public', express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'))
})

app.listen(port, host, () => {
  console.log(`server running at ${host}:${port}`)
})
