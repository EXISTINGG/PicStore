import express from 'express'
import multer from 'multer' // 文件上传中间件
import {  checkPowerMd } from './folder.js' // 导入检查路径合法性中间件
import fileHandle from '../router_handler/file.js'

const router = new express.Router()
const LIMIT_FILE_SIZE = 1024 * 1024 * 20 // 限制文件大小
export const LIMIT_UNEXPECTED_FILE = 10 // 限制文件数量

// 检查文件类型,只允许MIME类型的image/上传,前端使用accept="image/*"规范
// 当修改文件后缀为图片类型,会绕过此限制,但后面的程序还会严格检查是否为图片类型
const imageFileFilter = (req, file, cb) => {
  // 检查文件类型是否为图片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true) // 允许上传
  } else {
    cb(new Error('只允许上传图片类型文件')) // 拒绝上传
  }
}

// 配置 multer 中间件 dest:'./tempfile'表示创建临时文件夹, 最大20M
const upload = multer({
  dest: './tempfile',
  limits: { fileSize: LIMIT_FILE_SIZE },
  fileFilter: imageFileFilter
})
// file是上传的字段
router.post('/upload', checkPowerMd,  upload.single('file'),  fileHandle.uploadFile)
// 最大限制为10个
router.post('/uploads',checkPowerMd,upload.array('files', LIMIT_UNEXPECTED_FILE),  fileHandle.uploadFiles)
// http链接上传,支持批量最大为10,链接形式暂不受大小限制
router.post('/urlfile', checkPowerMd , fileHandle.processFiles)
router.post('/deletefile', checkPowerMd, fileHandle.deleteFile)
router.post('/renamefile', checkPowerMd, fileHandle.renameFile)
router.get('/api/randomimg', fileHandle.randomImg)

import { S3Client, PutObjectCommand,DeleteObjectCommand,DeleteObjectsCommand } from '@aws-sdk/client-s3'
const client = new S3Client({ endpoint: 'https://s3.us-east-005.backblazeb2.com',region: 'us-east-005' })

const uploads = multer({
  limits: { fileSize: LIMIT_FILE_SIZE },
  fileFilter: imageFileFilter
})

router.put('/api/savecloud', uploads.single('file'), async (req, res) => {
  const {buffer,originalname,size,mimetype} = req.file
  console.log(size);
  const params = {
    Bucket: 'ExistingPicStore', // 存储桶名称
    Key: originalname, // 文件在存储桶中的名字  
    Body: buffer, // 使用文件内容
    ContentType: mimetype, // 设置文件的内容类型
  }

  try {
    const resData = await client.send(new PutObjectCommand(params))
    res.send({message: 'ok',resData,data: {url: `https://s3.us-east-005.backblazeb2.com/ExistingPicStore/${originalname}`}})
  } catch (error) {
    res.err(error)
  }
})

router.delete('/api/deleteFile', async (req,res) => {
  const {fileName} = req.query
  
  if(!fileName) return res.err('kkk')

  const input = {
    Bucket: "ExistingPicStore",
    Key: fileName,
    // VersionId: 直接删除,没有则标记删除
    VersionId: ''
  };

  try {
    const resData = await client.send(new DeleteObjectCommand(input));
    res.send(resData)
  } catch (error) {
    res.err(error)
  }
})

import db from '../db/index.js'
router.post('/api/deleteFiles', async (req,res) => {
  const {fileList} = req.body
  console.log('fileList',fileList);

  const querySql = `SELECT * FROM images WHERE name IN (?)`
  const [queryRes] = await db.query(querySql,[fileList])
  console.log(queryRes);


  const Objects = queryRes.map(item => {
    return {
      Key: item.name, 
      VersionId: item.version_id
    }
  })

  console.log(Objects);



  const command = new DeleteObjectsCommand({
    Bucket: 'ExistingPicStore',
    Delete: {
      Objects
    },
  });

  try {
    const  Deleted  = await client.send(command);
    console.log(Deleted);
   
  res.send(Deleted)

  } catch (err) {
    console.error(err);
  }
})


export default router
