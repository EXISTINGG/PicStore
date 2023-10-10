import express from 'express';
import db from '../db/index.js'
import expressJoi from '@escook/express-joi' // 验证数据的中间件
import {updatepermissions_schema, changeinterface_schema,deleteuser_schema,restoreuser_schema, uploadLog_schema} from '../schema/user.js' // 验证规则
import {changeSysSet_scheam} from '../schema/system.js'
import adminHandle from '../router_handler/admin.js'
import {checkpermissions} from '../router/album.js'

const router = new express.Router()

/**
 * 根据用户 ID 和用户名获取用户权限
 * @param {number} id - 用户 ID
 * @param {string} username - 用户名
 * @returns {Promise<Array|Object>} - 如果查询成功，返回包含用户权限的对象；如果查询失败，返回空数组
 */
export async function getUserPermissionsByID(id,username) {
  const querySql = 'SELECT permissions FROM user WHERE id = ? AND username = ?';
  try {
    const [queryRes] = await db.query(querySql, [id, username]);
    return queryRes;
  } catch (error) {
    console.log(error);
    return []
  }
}

/**
 * 根据用户名获取用户权限
 * @param {string} username - 用户名
 * @returns {Promise<Array|Object>} - 如果查询成功，返回包含用户权限的对象；如果查询失败，返回空数组
 */
export async function getUserPermissions(username) {
  const querySql = 'SELECT permissions FROM user WHERE username = ?';
  try {
    const [queryRes] = await db.query(querySql, [username]);
    return queryRes;
  } catch (error) {
    console.log(error);
    return []
  }
}

// 鉴权中间件(是否为管理员)
const isAdmin = async (req,res,next) => {
  const {username, id} = req.auth
  if(!username) return res.err('检验账号出错，请稍后再试')

  try {
    const querynameSql = 'select permissions from user where username = ? and id = ?';
    const [queryRes] = await db.query(querynameSql, [username,id]);

    // 执行 SQL 语句成功，但是查询到数据条数不等于 1
    if (queryRes.length !== 1) return res.err('账号或密码错误')
    // 如果权限既不是1也不是2,则不是管理员
    if(queryRes[0].permissions != 1 && queryRes[0].permissions != 2) return res.err('权限不足',403)

  } catch (error) {
    return res.err('权限不足',403)
  }
  next()
}

router.get('/getuser',isAdmin, adminHandle.getUser);
router.get('/getsignoutuser',isAdmin, adminHandle.getSignOutUser);
router.get('/deletesignoutuser',isAdmin, adminHandle.deleteSignOutUser);
router.post('/updatepermissions',expressJoi(updatepermissions_schema), isAdmin, adminHandle.updatePermissions);
router.get('/getinterface',isAdmin, adminHandle.getInterface);
router.post('/changeinterface',expressJoi(changeinterface_schema), isAdmin, adminHandle.changeInterfacePower);
router.post('/deleteuser',expressJoi(deleteuser_schema), isAdmin, adminHandle.deleteUser);
router.post('/restoreuser',expressJoi(restoreuser_schema), isAdmin, adminHandle.restoreUser);
// 获取系统设置
router.get('/getsystem',isAdmin, adminHandle.getSystemSet);
// 更改设置(可管理接口)
router.post('/changesystem', expressJoi(changeSysSet_scheam), isAdmin, checkpermissions, adminHandle.changeSystemSet);
// 查看所有相册
router.get('/getallalbum',isAdmin, adminHandle.getAllAlbum);
// 查看所有图片
router.get('/getallimg', expressJoi(uploadLog_schema), isAdmin, adminHandle.getAllImage);


export default router