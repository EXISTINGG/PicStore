import express from 'express'
import multer from 'multer' // 文件上传中间件
import expressJWT from 'express-jwt' // 解析token中间件
import expressJoi from '@escook/express-joi';
import {deleteImage_schema,getImage_schema,saveNetImage_schema} from '../schema/imagechema.js'
import imageHandle from '../router_handler/image.js'
import {checkpermissions} from '../router/album.js'

const router = new express.Router()
const jwtSecretKey = process.env.JWT_SECRETKEY


// 检查文件类型,只允许MIME类型的image/上传,前端使用accept="image/*"规范
// 当修改文件后缀为图片类型,会绕过此限制,但后面的程序还会严格检查是否为图片类型
/**
 * 检查文件类型是否为图片
 * @param {Object} req - 请求对象
 * @param {Object} file - 上传的文件对象
 * @param {Function} cb - 回调函数 (error: Error, acceptFile: boolean)
 */
function imageFileFilter(req, file, cb) {
  // 检查文件类型是否为图片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true) // 允许上传
  } else {
    cb(new Error('只允许上传图片类型文件')) // 拒绝上传
  }
}

const upload = multer({
  limits: {fileSize: 1024 * 1024 * 2},
  fileFilter: imageFileFilter
})

router.post('/upload', upload.single('image'), checkpermissions, imageHandle.saveImage)
router.post('/deleteimg', expressJoi(deleteImage_schema), checkpermissions, imageHandle.deleteImage)
router.get('/api/getimg', expressJoi(getImage_schema), expressJWT.expressjwt({secret: jwtSecretKey,algorithms: ["HS256"],credentialsRequired: false}), imageHandle.getImage)
// 网络图片
router.post('/netimg', expressJoi(saveNetImage_schema), checkpermissions, imageHandle.saveNetImage);
// 随机图,接口返回图片,只能获取公共图片
router.get('/api/randomimg', imageHandle.randomImage);
// 随机图,接口返回图片链接,只能获取公共图片
router.get('/api/randomimgurl', imageHandle.randomImageUrl);

export default router