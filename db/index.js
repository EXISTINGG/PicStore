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

console.log('host',host);
console.log('port',port);

export default pool.promise()