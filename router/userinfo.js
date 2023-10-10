import express from 'express';
import db from '../db/index.js'
import expressJoi from '@escook/express-joi'; // 验证数据的中间件
import {updateinfo_schema, updatepwd_schema,changeemailcode_schema, changeemail_schema, uploadLog_schema} from '../schema/user.js'; // 验证规则
import userInfoHandle from '../router_handler/userinfo.js';

const router = new express.Router()

// 检查用户是否注销中间件,或有无此账号
const checkStatus = async (req,res, next) => {
  const {username, email, id} = req.auth;
  if((!username && !email) || !id) return res.err('账号或密码错误');

  try {
    let querySql;
    let queryRes;
    if (username) {
      // 使用用户名进行查询
      querySql = 'SELECT status FROM user WHERE id = ? AND username = ?';
      [queryRes] = await db.query(querySql, [id,username]);
    } else {
      // 使用邮箱进行查询
      querySql = 'SELECT status FROM user WHERE id = ? AND email = ?';
      [queryRes] = await db.query(querySql, [id,email]);
    }

    // 查询到数据条数不等于1或已注销
    if (queryRes.length !== 1 || queryRes[0].status != 1) {
      return res.err('账号或密码错误',404);
    }

  } catch (error) {
    res.err('服务器错误/(ㄒoㄒ)/~~',500)
  }
  next()
};

router.post('/updateinfo',checkStatus,expressJoi(updateinfo_schema), userInfoHandle.updateUserinfo);
router.post('/updatepwd',checkStatus,expressJoi(updatepwd_schema), userInfoHandle.updatePassword);
// 此接口标记删除用户
router.post('/markdeleteuser',checkStatus, userInfoHandle.markUserAsDeleted);
// 此接口直接删除用户(不考虑使用)
// router.post('/deleteuser',checkStatus, userInfoHandle.deleteUser)
// 发送更换邮箱验证码
router.post('/updateemailcode',checkStatus,expressJoi(changeemailcode_schema), userInfoHandle.sendupdateEmailCode);
// 验证验证码更换邮箱
router.post('/updateemail',checkStatus,expressJoi(changeemail_schema), userInfoHandle.updateEmail);
// 个人上传日志
router.get('/uploadlog',checkStatus, expressJoi(uploadLog_schema), userInfoHandle.userUploadLog);


export default router