import 'dotenv/config'
import { createApp } from './app'
import { resolveServerHost, resolveServerPort } from './serverConfig'

const port = resolveServerPort(process.env)
const host = resolveServerHost(process.env)
const app = createApp(process.env)
app.listen(port, host, () => {
  console.log(`AI PPT server listening on http://${host}:${port}`)
})
