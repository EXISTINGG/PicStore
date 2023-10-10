import express from 'express';
import expressJoi from '@escook/express-joi'; // 验证数据的中间件
import {reg_schema, login_schema, email_schema,checkpwdcode_schema} from '../schema/user.js'; // 验证规则
import userHandle from '../router_handler/user.js';

const router = new express.Router()

// 检查用户是否注销中间件,或有无此账号
// export const checkStatus = async (req,res, next) => {
//   const {username, email, id} = req.auth;
//   if((!username && !email) || !id) return res.err('账号或密码错误');

//   try {
//     let querySql;
//     let queryRes;
//     if (username) {
//       // 使用用户名进行查询
//       querySql = 'SELECT status FROM user WHERE id = ? AND username = ?';
//       [queryRes] = await db.query(querySql, [id,username]);
//     } else {
//       // 使用邮箱进行查询
//       querySql = 'SELECT status FROM user WHERE id = ? AND email = ?';
//       [queryRes] = await db.query(querySql, [id,email]);
//     }

//     // 查询到数据条数不等于1或已注销
//     if (queryRes.length !== 1 || queryRes[0].status != 1) {
//       return res.err('账号或密码错误',404);
//     }

//   } catch (error) {
//     res.err('服务器错误/(ㄒoㄒ)/~~',500)
//   }
//   next()
// }

router.post('/sendcode',expressJoi(email_schema),userHandle.sendCode)
router.post('/register',expressJoi(reg_schema), userHandle.registerUser)
router.post('/login',expressJoi(login_schema), userHandle.loginAccount)
// 重置密码验证码
router.post('/resetpwdcode', expressJoi(email_schema), userHandle.sendResetPwdEmail);
router.post('/resetpwd', expressJoi(checkpwdcode_schema), userHandle.checkResetPwdCode);

export default router