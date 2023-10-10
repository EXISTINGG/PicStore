import express from 'express'
// import multer from 'multer'; // 文件上传中间件
import cors from 'cors' // cors中间件
import Joi from 'joi'
import expressJWT from 'express-jwt' // 解析token中间件
// import fileRouter from './router/file.js'
// import folderRouter from './router/folder.js'
import albumRouter from './router/album.js'
import imageRouter from './router/image.js'
import userRouter from './router/user.js'
import userinfoRouter from './router/userinfo.js'
import adminRouter from './router/admin.js'
import 'dotenv/config'

const jwtSecretKey = process.env.JWT_SECRETKEY
export const SERVER_ADDRESS = process.env.SERVER_ADDRESS // 服务器地址

const app = express()

const router = new express.Router()

// 托管静态资源,将uploads目录下的文件对外开放
app.use('/uploads', express.static('uploads'))

//在路由之前配置解析
//配置解析表单数据中间件 注意: 只能解析 application/x-www-form-urlencoded 格式的表单数据
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//解决跨域问题,在路由之前,配置cors
app.use(cors())

//#region
// 配置 multer 中间件 dest:'./tempfile'表示创建临时文件夹
// const upload = multer({ dest: './tempfile' });

// 单图,img是上传的字段
// app.post('/upload', upload.single('img'), (req, res) => {
//   const file = req.file;
//   res.send({
//     file,
//     msg: 'ok'
//   });
// });

// 多图,2为限制数量,超出即报错
// app.post('/uploads', upload.array('files',2), (req,res) => {
//   const file = req.files;
//   res.send({
//     file,
//     msg: 'ok'
//   });
// })

// 多图,多文件限制
// app.post('/uploadss', upload.fields([{name: 'file1', maxCount: 1},{name: 'file2',maxCount: 2},]), (req,res) => {
//   const file = req.files
//   res.send({
//     file,
//     msg: 'ok'
//   });
// })
//#endregion

//在路由之前 配置响应数据的中间件
app.use((req, res, next) => {
  // 设置响应头,防止中文乱码
  res.setHeader('Content-Type', 'text/html; charset=UTF-8')
  //err的值,可能是错误对象或描述错误的字符串
  res.err = (error, status = 400) => {
    res.send({
      status,
      message: error instanceof Error ? error.message : error
    })
  }
  next()
})

//在路由之前,配置解析token中间件
//使用 .unless指定哪些接口不需要进行 Token 的身份认证
// 注册将 JWT 字符串解析还原成 JSON 对象的中间件
app.use(expressJWT.expressjwt({ secret: jwtSecretKey, algorithms: ['HS256'] }).unless({ path: [/\/api\//g, /^\/$/, /\/uploads\//] }));

// 挂载路由
app.use(router.get('/', (req, res) => res.send(`express server running at ${SERVER_ADDRESS}`)));

//#region 
// 接口已废弃
// app.use('/file', fileRouter);
// app.use('/folder', folderRouter);
//#endregion

app.use('/album', albumRouter);
app.use('/image', imageRouter);
app.use('/api/user', userRouter);
app.use('/userinfo', userinfoRouter);
app.use('/admin', adminRouter);

// 使用 "res.headersSent" 检查是否已经开始发出响应。
// 如果已经开始，那么已经找到了匹配的静态文件或路由。
// 如果尚未开始，那么没有找到任何匹配项，应返回 404
// 处理 404 - 资源未找到，主要针对静态资源
app.use((req, res, next) => {
  const url = req.url
  if (/\/uploads\//.test(url)) {
    if (!res.headersSent) return res.err('所请求的资源不存在', 404);
  } else {
    next()
  }
})

// 全局错误级别中间件中，捕获验证失败的错误，并把验证失败的结果响应给客户端
// 仅当请求没有匹配到任何路由或静态资源时，才返回404。
// 该中间件放在所有路由和全局错误处理之前以确保此情况。
// 所有其他错误应在全局错误处理中处理并返回适当的状态码，而不统一返回404。
// 错误中间件
app.use((err, req, res, next) => {
  console.log('捕捉到错误:',err);
  // 数据验证失败
  if (err instanceof Joi.ValidationError) return res.err(err);

  // 捕获身份认证失败的错误
  if (err.name === 'UnauthorizedError') return res.err('身份认证失败', 401);

  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.err('文件数量超过限制');

  if (err.code === 'LIMIT_FILE_SIZE') return res.err('文件大小超过限制');

  // 未知错误
  res.err(err);
})

app.listen(80, () => {
  console.log(`express server running at ${SERVER_ADDRESS}`)
})
// 200 OK: 请求成功
// 201 Created: 创建资源成功
// 204 No Content: 请求成功，但响应中不包含任何内容
// 400 Bad Request: 请求参数有误或无效
// 401 Unauthorized: 请求需要用户身份验证
// 403 Forbidden: 请求被服务器拒绝，通常是因为权限不足
// 404 Not Found: 请求的资源不存在
// 500 Internal Server Error: 服务器内部错误
