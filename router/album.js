import express from 'express';
import db from '../db/index.js';
import expressJoi from '@escook/express-joi';
import {createAlbum_schema,updateAlbum_schema,deleteAlbum_schema} from '../schema/albumchema.js'
import albumsHandle from '../router_handler/album.js';
import expressJWT from 'express-jwt' // 解析token中间件

const router = new express.Router()
const jwtSecretKey = process.env.JWT_SECRETKEY

let storageType; // 全局变量用于存储存储类型

// 检查存储类型
export async function initializeStorageType () {
  const querySql = 'SELECT storage_type FROM systemset';
  try {
    const [queryRes] = await db.query(querySql);
    console.log('storageType',queryRes);
    if (queryRes.length !== 1) {
      storageType = 0; // 查询失败,默认为本机存储
    } else {
      storageType = queryRes[0].storage_type;
    }
  } catch (error) {
    console.log(error);
    storageType = 0; // 查询出错，默认为本机存储
  }
};

initializeStorageType(); 

// 检查存储类型中间件
export async function checkStorageType (req, res, next) {
  req.storageType = storageType || 0;
  next();
};

// 检查用户权限是否足够
export async function checkpermissions (req,res,next) {
  // 获取当前用户信息
  const {id,username} = req.auth;
  // 获取当前请求接口
  const path = req.path.slice(1);

  try {
    const querySql = `SELECT permissions FROM (
                      SELECT permissions FROM user WHERE id=? AND username = ?
                      UNION ALL 
                      SELECT required_permissions FROM interface WHERE name = ?
                      ) AS result`
    
    const [queryRes] = await db.query(querySql,[id,username,path]);
    if(queryRes.length !== 2) return res.err('出错了,请稍后再试');
    
    const [userPower,requestPower] = queryRes;
    console.log('userPower',userPower.permissions,'requestPower',requestPower.permissions);

    // 当用户的权限(数字)大于所需权限,则代表权限不足
    if(userPower.permissions > requestPower.permissions) return res.err('权限不足',403);

  } catch (error) {
    console.log(error);
    return res.err('出错了,请稍后再试', 500)
  }
  next();
};


router.post('/addalbum',expressJoi(createAlbum_schema), checkpermissions, checkStorageType,albumsHandle.createAlbum)
router.post('/updatealbum', expressJoi(updateAlbum_schema), checkpermissions, albumsHandle.updateAlbum)
// 此接口有token时进行解析,没有则继续(需credentialsRequired为false)
router.get('/api/getalbum',expressJWT.expressjwt({secret: jwtSecretKey,algorithms: ["HS256"],credentialsRequired: false}), albumsHandle.getAlbum)
router.post('/deletealbum', expressJoi(deleteAlbum_schema), checkpermissions, albumsHandle.deleteAlbum)

export default router