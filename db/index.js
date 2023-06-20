import mysql from 'mysql2'
import 'dotenv/config'

const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_DATABASE;

const pool = mysql.createPool({
  host,
  port, // port: 数据库端口,默认 3306
  user,
  password,
  database
})

// const pool = mysql.createPool({
//   host: 'cdf5f55b2ac9.c.methodot.com',
//   port: 30405, // port: 数据库端口,默认 3306
//   user: 'root',
//   password: 'Existing',
//   database: 'picstore'
// })

export default pool.promise()