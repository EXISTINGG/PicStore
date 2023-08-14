import fs from 'fs/promises';
import path from 'path'
import axios from 'axios'
import {fileTypeFromFile} from 'file-type'
import {baseUploadsPath,getAllSubdirectories,getFilesInDirectory} from './folder.js'
import checkPath from '../utils/checkPath.js'
import {SERVER_ADDRESS} from '../app.js'
import {LIMIT_UNEXPECTED_FILE} from '../router/file.js'

const staticFolder = 'uploads'

// 文件上传处理
const uploadFile = async (req,res) => {
  const timestamp = Date.now(); // 获取当前时间戳 
  const file = req.file;
  if(!file) return res.err('文件为空')
  const folder = req.body.folder
  if(!folder) return res.err('请指定目录')

  // 检查根路径
  const resultPath = checkPath.checkPathRoot(folder)  
  // 检查路径是否包含子目录
  const resultChild = checkPath.checkPathChild(resultPath.resolvedPath)

  if(!resultPath.isLegal || resultChild) {
    // 删除缓存文件(临时的二进制文件)
    await fs.unlink(file.path);
    return res.err('非法路径');
  }

  const resultFolder = await checkFolderExists(folder)
  if(resultFolder.res) {
    const resultImg = await transferFile(folder,file,timestamp)
    console.log(resultImg.url);
    if (resultImg.res) {
      res.send({
        status: 200,
        data: {
          url: resultImg.url,
          message: '文件写入成功'
        }
      });
    } else {
      res.send({
        status: 400,
        message: resultImg.msg,
        data: {
          errUrl: resultImg.errUrl
        }
      })
    }
  } else {
    res.err(resultFolder.msg)
  }
}

// 文件上传处理,多文件
const uploadFiles = async (req, res) => {
  const timestamp = Date.now(); // 获取当前时间戳 
  
  const files = req.files;
  if(!files) return res.err('文件为空')
  const folder = req.body.folder
  if(!folder) return res.err('请指定目录')

  // 检查根路径
  const resultPath = checkPath.checkPathRoot(folder)
  
  // 检查路径是否包含子目录
  const resultChild = checkPath.checkPathChild(resultPath.resolvedPath)

  if(!resultPath.isLegal || resultChild) {
    for (const file of files) {
      // 删除缓存文件(临时的二进制文件)
      await fs.unlink(file.path);
    }
    return res.err('非法路径'); 
  }

  try {
    const resultFile = await checkFolderExists(folder)
    
    if(resultFile.res) {
      const resultImg = await writeMultipleFiles(folder,files,timestamp);

      const errUrl = resultImg.errUrl
      if(errUrl.length === 0 && resultImg.res) {
        return res.send({
          status: 200,
          data: {
            message: '文件写入成功',
            url:resultImg.url,
          }
        });
      } else if(resultImg.res) {
        res.send({
          status: 206,
          data: {
            message: '部分文件上传失败',
            url:resultImg.url,
            errUrl
          }
        });
      } else {
        // res.err(resultImg.msg)
        res.send({
          status: 400,
          message: resultImg.msg,
          data: {
            errUrl
          }
        })
      }
    } else {
      res.err(resultFile.msg)
    }
  } catch (error) {
    res.err(error)
  }
}

// 删除文件处理
const deleteFile = async (req,res) => {
  if(!req.body.folder) return res.err('请指定目录')
  if(!req.body.file) return res.err('请指定文件')

  try {
    await fs.unlink(`${baseUploadsPath}/${req.body.folder}/${req.body.file}`)

    res.send({
      status: 200,
      message: '删除成功'
    })

  } catch (error) {
    res.err('删除失败')
  }
}

// 重命名文件处理
const renameFile = async (req,res) => {
  const folder = req.body.folder
  const oldName = req.body.oldName
  const newName = req.body.newName
  const fileExtension = /.[a-zA-Z]*$/.exec(oldName)[0];

  if (!folder) return res.err('请指定目录')

  if (!newName) return res.err('请输入新的文件名');
  
  if (!oldName) return res.err('请指定要更改的文件名');
  
  // 解析为绝对路径
  const oldFolderPath = path.resolve(baseUploadsPath, folder, oldName);
  const newFolderPath = path.resolve(baseUploadsPath, folder, newName + fileExtension);

  // 检查路径是否在指定的根路径下(必须在upload的指定的folder的目录下)
  if (!oldFolderPath.startsWith(path.resolve(baseUploadsPath, folder)) || !newFolderPath.startsWith(path.resolve(baseUploadsPath, folder))) {
    return res.err('非法文件名');
  }

  // 检查路径是否包含子目录(包含文件名,长度为2)
  const oldResultChild = checkPath.checkPathChild(oldFolderPath,2)
  const newResultChild = checkPath.checkPathChild(newFolderPath,2)

  if(oldResultChild || newResultChild) return res.err('非法文件名');

  try {
    // 检查新的文件路径是否已经存在
    try {
      await fs.access(newFolderPath);
      return res.err('文件名已存在');
    } catch (error) {
      // 新文件路径不存在，可以继续重命名
      await fs.rename(oldFolderPath, newFolderPath);

      res.send({
        status: 200,
        message: '重命名成功'
      });
    }

    // await fs.rename(oldFolderPath,newFolderPath)

    // res.send({
    //   status: 200,
    //   message: '重命名成功'
    // })
  } catch (err) {
    res.err('重命名失败');
  }
}

let returnNum = 0
// 随机返回一张图
const randomImg = async (req,res) => {
  returnNum++
  try {
    const folder = await getAllSubdirectories(baseUploadsPath);
    const randomIndexFolder = getRandomInt(0, folder.length - 1)
    const randomValueFolder = folder[randomIndexFolder];

    const files = await getFilesInDirectory(`${baseUploadsPath}/${randomValueFolder}`)
    // 防止目录中没有文件,递归调用
    if (files.length === 0) {
      console.log(returnNum);
      if(returnNum > 10) {
        return res.err('获取失败')
      } else {
        return randomImg(req,res)
      }
    }
    
    const randomIndexFile = getRandomInt(0, files.length - 1)
    const randomValueFile = `${SERVER_ADDRESS}/${staticFolder}/${randomValueFolder}/${files[randomIndexFile]}`
    console.log(randomValueFile);
    res.send({
      status: 200,
      url: randomValueFile 
    })
    
  } catch (error) {
    res.err('获取失败')
  }
}
// /^http/.test
// 处理链接形式图片文件
const processFiles = async (req,res) => {
  if(!req.body.folder) return res.err('请指定目录')
  if(!req.body.fileUrls) return res.err('链接为空')

  // 检查目录是否存在
  const resultCheck = await checkFolderExists(req.body.folder)
  if(!resultCheck.res) return res.err(resultCheck.msg)
  const fileUrls = JSON.parse(req.body.fileUrls.trim().replace(/[\r\n]+/g, '').replace(/'/g, '"'));
  // const fileUrls = (req.body.fileUrls.replace(/[\n"']/g, '').split(',')); 
  if(fileUrls.length > LIMIT_UNEXPECTED_FILE) return res.err('数量最多为10');
  // 定义一个数组来存储上传失败的文件名
  const failedFiles = [];
  const fileAddresses = [];

  try {
    for (const fileUrl of fileUrls) {
      const resultAxios = await getAxios(fileUrl)
      // 请求错误
      if(!resultAxios.isSuc) {
        failedFiles.push(resultAxios.url);
        // 有错误,继续执行
        continue;
      }
    
      // 写入目录,重复文件时,覆盖文件
      await fs.writeFile(`${baseUploadsPath}/${req.body.folder}/${resultAxios.imageName}`,resultAxios.imageData)
      // 检测文件的类型
      const resultType = await detectedType(req.body.folder,resultAxios.imageName,fileUrl)
      // 非图片类型
      if(!resultType.isImg) {
        failedFiles.push(resultType.url);
        continue;
      }

      const fileAddress = `${SERVER_ADDRESS}/${staticFolder}/${req.body.folder}/${resultAxios.imageName}`;
      fileAddresses.push(fileAddress);
    }
    if(failedFiles.length === 0) {
      res.send({
        status: 200,
        message: '上传成功',
        url: fileAddresses
      });
    } else {
      res.send({
        status: 206,
        message: '部分上传失败',
        data: {
          url: fileAddresses,
          errUrl: failedFiles // 返回上传失败的文件名
        }
      });
    }
    
  } catch (err) {
    res.send({
      status: 400,
      message: '上传失败',
      data: {
        errUrl: failedFiles // 返回上传失败的文件名
      } 
    });
  }
 }
 


// 转存文件
// 1查找目录是否存在
export const checkFolderExists = async (folder) => {
  try {
    await fs.access(`./uploads/${folder}`);
    return {res: true}
  } catch (err) {
    return {res: false, msg: `目录不存在或无法访问`}
  }
};

// 2写入文件
const transferFile = async (folder,file,timestamp) => {
  let errUrl
  // 去除文件名的所有空格
  const filename = file.originalname.replace(/\s/g, "")
  try {
    await fs.writeFile(`${baseUploadsPath}/${folder}/${timestamp}${filename}`,await fs.readFile(file.path));

    // 删除缓存文件(临时的二进制文件)
    await fs.unlink(file.path)

    // 检测文件的类型
    const resultType = await detectedType(folder,`${timestamp}${filename}`,filename)
    if(!resultType.isImg) {
      errUrl = resultType.url
      return {res: false, msg: '写入文件时出错', errUrl}
    }
    return {res: true, url: `${SERVER_ADDRESS}/${staticFolder}/${folder}/${timestamp}${filename}`}
  } catch (err) {
    return {res: false, msg: '写入文件时出错', errUrl}
  } 
}

//  转存文件,多文件
const writeMultipleFiles = async (folder, fileList, timestamp) => {
  const fileAddresses = [];
  const failedFiles = [];
  let isSuccess = false

  for (const file of fileList) {
    try {
      // 去除文件名的所有空格
      const filename = file.originalname.replace(/\s/g, "")
      // console.log(111,filename);
      // console.log(232,file.originalname);

      // 读取文件的位置，写入文件
      await fs.writeFile(`./uploads/${folder}/${timestamp}${filename}`, await fs.readFile(file.path));

      // 删除缓存文件(临时的二进制文件)
      await fs.unlink(file.path);

      // 检测文件的类型
      const resultType = await detectedType(folder,`${timestamp}${filename}`,filename)
      if(!resultType.isImg) {
        failedFiles.push(resultType.url);
        continue;
      }

      const fileAddress = `${SERVER_ADDRESS}/${staticFolder}/${folder}/${timestamp}${filename}`;
      fileAddresses.push(fileAddress);
      isSuccess = true
    } catch (error) {
      isSuccess = false
      return {res: false, msg: '写入文件时出错', errUrl: failedFiles}
    }
  }

  if (isSuccess) {
    if (failedFiles.length === 0) {
      return {res: true, url: fileAddresses, errUrl: []}
    } else {
      return {res: true, url: fileAddresses, errUrl: failedFiles}
    }
  } else {
    return {res: false, msg: '写入文件时出错', errUrl: failedFiles}
  }
}

// 获取随机数据
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 请求函数
const getAxios = async url => {
  try {
    // 发起请求
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // 请求回来的数据
    const imageData = response.data;
    // 文件名称
    const imageName = url.slice(url.lastIndexOf('/')+1,url.length);
    return {
      isSuc: true,
      imageData,
      imageName
    }
  } catch (err) {
     return {
      isSuc: false,
      url
     }  
  }
}

// 检测文件的 MIME 类型
const detectedType = async (folder,file,url) => {
  try {
    const result = await fileTypeFromFile(`${baseUploadsPath}/${folder}/${file}`);
    // 非图片类型
    if (!result || !result.mime.startsWith('image/')) {
      await fs.unlink(`${baseUploadsPath}/${folder}/${file}`)
      return {
        isImg: false,
        url
      }
    } else {
      return {
        isImg: true
      }
    }
  } catch (err) {
    return {
      isImg: false,
      url
    }
  }
}



export default {
  uploadFile,
  uploadFiles,
  deleteFile,
  renameFile,
  randomImg,
  processFiles,
}