import express from 'express';
import checkPath from '../utils/checkPath.js'
import folderHandle from '../router_handler/folder.js'

const router = new express.Router()

// 检查目录合法性中间件
export const checkPathMd = async (req,res,next) => {
  const folder = req.body.folder || req.query.folder
  if(!folder) return res.err('请输入目录')

  // 检查根路径
  const resultPathRoot = checkPath.checkPathRoot(folder)
  if(!resultPathRoot.isLegal) return res.err('非法路径1');

  // 检查路径是否包含子目录
  const resultChild = checkPath.checkPathChild(resultPathRoot.resolvedPath)
  if(resultChild) return res.err('非法路径2');

  next()
}

router.get('/getfolder', folderHandle.getFolder)
router.post('/addfolder', checkPathMd, folderHandle.addFolder)
router.get('/getfolderfile',checkPathMd, folderHandle.getFolderFile)
router.post('/deletefolder', checkPathMd,folderHandle.deleteFolder)
router.post('/renamefolder', folderHandle.renameFolder)

export default router