import express from 'express'
// import multer from 'multer'; // 文件上传中间件
import cors from 'cors' // cors中间件
import fileRouter from './router/file.js'
import folderRouter from './router/folder.js'
// import checkPath from './utils/checkPath.js'

export const SERVER_ADDRESS = '127.0.0.1' // 服务器地址
const PORT = process.env.PORT || 80; // 端口地址(Render部署随机分配)

const app = express();

const router = new express.Router()

// 托管静态资源,将uploads目录下的文件对外开放
app.use(express.static('uploads'));

//在路由之前配置解析
//配置解析表单数据中间件 注意: 只能解析 application/x-www-form-urlencoded 格式的表单数据
app.use(express.urlencoded({extended: false}))

//解决跨域问题,在路由之前,配置cors
app.use(cors())

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





//在路由之前 配置响应数据的中间件
app.use((req, res, next) => {
  //err的值,可能是错误对象或描述错误的字符串
  res.err = (err, status = 400) => {
      res.send({
          status,
          messgae: err instanceof Error ? err.message : err 
      })
  }
  next()
})





// 挂载路由
app.use(router.get('/',(req,res) => res.send(`express server running at https://picapi.hxq-001.top,${PORT}`)))
app.use('/file',fileRouter)
app.use('/folder',folderRouter)


// 全局错误级别中间件中，捕获验证失败的错误，并把验证失败的结果响应给客户端：
// 错误中间件
app.use((err, req, res, next) => {
  // 数据验证失败
  // if (err instanceof joi.ValidationError) return res.err(err)

  // 捕获身份认证失败的错误
  // if (err.name === 'UnauthorizedError') return res.err('身份认证失败！')

  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.err('文件数量超过限制');
  
  if (err.code === 'LIMIT_FILE_SIZE') return res.err('文件大小超过限制');

  // 未知错误
  res.err(err)
})

app.listen(PORT, () => {
  console.log(`express server running at 127.0.0.1,${PORT}`);
});
// 200 OK: 请求成功
// 201 Created: 创建资源成功
// 204 No Content: 请求成功，但响应中不包含任何内容
// 400 Bad Request: 请求参数有误或无效
// 401 Unauthorized: 请求需要用户身份验证
// 403 Forbidden: 请求被服务器拒绝，通常是因为权限不足
// 404 Not Found: 请求的资源不存在
// 500 Internal Server Error: 服务器内部错误