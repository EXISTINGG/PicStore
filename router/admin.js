import express from 'express';
import db from '../db/index.js'
import expressJoi from '@escook/express-joi' // 验证数据的中间件
import {updatepower_schema, changeinterface_schema,deleteuser_schema} from '../schema/user.js' // 验证规则
import adminHandle from '../router_handler/admin.js'

const router = new express.Router()

// 鉴权中间件(是否为管理员)
const isAdmin = async (req,res,next) => {
  const {username, id} = req.auth
  if(!username) return res.err('检验账号出错，请稍后再试')

  try {
    const querynameSql = 'select power from user where username = ? and id = ?';
    const [queryRes] = await db.query(querynameSql, [username,id]);

    // 执行 SQL 语句成功，但是查询到数据条数不等于 1
    if (queryRes.length !== 1) return res.err('查无此账号')
    // 如果权限既不是1也不是2,则不是管理员
    if(queryRes[0].power != 1 && queryRes[0].power != 2) return res.err('权限不足',403)

  } catch (error) {
    return res.err('权限不足',403)
  }
  next()
}

router.get('/getuser',isAdmin, adminHandle.getUser)
router.get('/getsignoutuser',isAdmin, adminHandle.getSignOutUser)
router.get('/deletesignoutuser',isAdmin, adminHandle.deleteSignOutUser)
router.post('/updatepower',expressJoi(updatepower_schema), isAdmin, adminHandle.updatePower)
router.get('/getinterface',isAdmin, adminHandle.getInterface)
router.post('/changeinterface',expressJoi(changeinterface_schema), isAdmin, adminHandle.changeInterfacePower)
router.post('/deleteuser',expressJoi(deleteuser_schema), isAdmin, adminHandle.deleteUser)
router.post('/restoreuser',expressJoi(deleteuser_schema), isAdmin, adminHandle.restoreUser)

export default router