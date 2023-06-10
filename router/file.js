import express from 'express';
import multer from 'multer'; // 文件上传中间件
import {checkPathMd} from './folder.js' // 导入检查路径合法性中间件
import fileHandle from '../router_handler/file.js'

const router = new express.Router()
const LIMIT_FILE_SIZE = 1024 * 1024 * 20 // 限制文件大小
export const LIMIT_UNEXPECTED_FILE = 10 // 限制文件数量

// 检查文件类型,只允许MIME类型的image/上传,前端使用accept="image/*"规范
// 当修改文件后缀为图片类型,会绕过此限制,但后面的程序还会严格检查是否为图片类型
const fileFilter = (req, file, cb) => {
  // 检查文件类型是否为图片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // 允许上传
  } else {
    cb(new Error('只允许上传图片类型文件')); // 拒绝上传
  }
};

// 配置 multer 中间件 dest:'./tempfile'表示创建临时文件夹, 最大20M
const upload = multer({ dest: './tempfile', limits: {fileSize: LIMIT_FILE_SIZE}, fileFilter });
// file是上传的字段
router.post('/upload',upload.single('file'),fileHandle.uploadFile)
// 最大限制为10个
router.post('/uploads',upload.array('files', LIMIT_UNEXPECTED_FILE), fileHandle.uploadFiles)
// http链接上传,支持批量最大为10,链接形式暂不受大小限制
router.post('/urlfile',checkPathMd, fileHandle.processFiles)
router.post('/deletefile',checkPathMd,fileHandle.deleteFile)
router.post('/renamefile', fileHandle.renameFile)
router.get('/randomimg', fileHandle.randomImg)

export default router