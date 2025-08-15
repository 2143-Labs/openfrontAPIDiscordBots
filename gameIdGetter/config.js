import fs from 'node:fs'
const config = JSON.parse(fs.readFileSync("./gameIdGetter/config.json"))
export default config
