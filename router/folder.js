import express from 'express';
import folderHandle from '../router_handler/folder.js'
import db from '../db/index.js';
import {PathChecker} from '../utils/checkPath.js'

const router = new express.Router()
const pathChecker = new PathChecker()

// 检查目录合法性中间件
export const checkPathMiddleware  = (req,res,next) => {
  const folder = req.body.folder || req.query.folder;
  if(!folder) return res.err('请输入目录');

  // 检查根路径
  const checkRootRes = pathChecker.checkPathRoot(folder);
  console.log('checkRootRes',checkRootRes);
  if(!resultPathRoot.isLegal) return res.err('非法路径');

  // 检查路径是否包含子目录
  const checkChildRes = pathChecker.checkPathChild(checkRootRes.resolvedPath)
  console.log('checkChildRes',checkChildRes)
  if(checkChildRes) return res.err('非法路径');

  next()
}

// 检查用户权限是否足够
export const checkPowerMd = async (req,res,next) => {
  // 获取当前用户信息
  const {id,username} = req.auth;
  // 获取当前请求接口
  const path = req.path.slice(1);
  try {
    const querySql = `SELECT permissions FROM (
                      SELECT permissions FROM user WHERE id=? AND username=?
                      UNION ALL 
                      SELECT required_permissions FROM interface WHERE name=?
                      ) AS result`
    
    const [queryRes] = await db.query(querySql,[id,username,path])

    if(queryRes.length > 2) return res.err('出错了,请稍后再试')

    const [userPower,requestPower] = queryRes
    // 当用户的权限(数字)大于所需权限,则代表权限不足
    if(userPower.permissions > requestPower.required_permissions) return res.err('权限不足',403)

  } catch (error) {
    return res.err('出错了,请稍后再试')
  }
  next();
}

router.get('/api/getfolder', folderHandle.getFolder)
router.post('/addfolder', checkPowerMd,  folderHandle.addFolder)
router.get('/api/getfolderfile',  folderHandle.getFolderFile)
router.post('/deletefolder',checkPowerMd,  folderHandle.deleteFolder)
router.post('/renamefolder',checkPowerMd, folderHandle.renameFolder)

export default router