import express from 'express';
import db from '../db/index.js'
import expressJoi from '@escook/express-joi' // 验证数据的中间件
import {reg_schema, login_schema, email_schema} from '../schema/user.js' // 验证规则
import userHandle from '../router_handler/user.js'

const router = new express.Router()

// 检查用户是否注销中间件
export const checkStatus = async (req,res, next) => {
  const {username, email} = req.body
  if(!username && !email) return res.err('请输入用户名或邮箱')

  try {
    let queryRes
    if (username) {
      // 使用用户名进行查询
      const queryUsernameSql = 'select status from user where username = ?';
      [queryRes] = await db.query(queryUsernameSql, username);
    } else {
      // 使用邮箱进行查询
      const queryEmailSql = 'select status from user where email = ?';
      [queryRes] = await db.query(queryEmailSql, email);
    }
    // 执行 SQL 语句成功，但是查询到数据条数不等于 1
    if (queryRes.length !== 1) return res.err('查无此账号')
    // 已注销
    if(queryRes[0].status != 1) return res.err('查无此账号')

  } catch (error) {
    res.err(error)
  }
  next()
}

router.post('/sendcode',expressJoi(email_schema),userHandle.sendCode)
router.post('/register',expressJoi(reg_schema), userHandle.registerUser)
router.post('/login',expressJoi(login_schema),checkStatus, userHandle.loginAccount)

export default router