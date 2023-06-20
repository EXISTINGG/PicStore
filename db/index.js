import mysql from 'mysql2'

const pool = mysql.createPool({
  host: 'cdf5f55b2ac9.c.methodot.com',
  port: 30405, // port: 数据库端口,默认 3306
  user: 'root',
  password: 'Existing',
  database: 'picstore'
})

export default pool.promise()