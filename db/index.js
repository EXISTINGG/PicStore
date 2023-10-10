import mysql from 'mysql2'
import 'dotenv/config'

const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_DATABASE;

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database
})

export default pool.promise()