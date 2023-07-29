import fs from 'fs/promises';
import fsExtra from 'fs-extra' // 删除文件夹(无论是否为空)
import {SERVER_ADDRESS} from '../app.js'
import checkPath from '../utils/checkPath.js'
import {checkFolderExists} from './file.js'

export const baseUploadsPath = './uploads'; // 指定根路径
const staticFolder = 'uploads'


// 获取目录处理
const getFolder = async (req,res) => {
  try {
    const allFolder = await getAllSubdirectories(baseUploadsPath)
    res.send({
      status: 200,
      allFolder
    })
  } catch (err) {
    res.err(err)
  }
}

// 获取目录下的文件处理
let currentFileIndex = 0;
let files = []; // 所有文件
let firstFolder //第一次请求的目录
const getFolderFile = async (req, res) => {
  const folder = req.query.folder
  if(!folder) return res.err('请指定目录')

  try {
    const pageSize = Number(req.query.size) || 5; // 每页数据量
    const isRefresh = req.query.refresh === 'true'
    // 刷新或与第一次的目录不同(防止篡改),都视为第一次请求
    if(isRefresh || firstFolder !== folder) {
      currentFileIndex = 0
    }
    // 第一次请求，读取数据
    if (currentFileIndex === 0) {
      // 记录第一次请求的目录
      firstFolder = folder
      // 获取指定目录下的文件数据
      files = await getFilesInDirectory(`${baseUploadsPath}/${folder}`);
    }

    // 按照当前位置和页面大小返回数据,限制每页的数量为 pageSize
    const startIndex = currentFileIndex;
    const endIndex = Math.min(currentFileIndex + pageSize, files.length);
    const result = files.slice(startIndex, endIndex);

    // 更新当前位置
    currentFileIndex = endIndex;

    // 增加服务器地址
    const resultUrl = result.map(item => `${SERVER_ADDRESS}/${staticFolder}/${folder}/${item}`)

    // 返回数据给前端
    res.send({
      status: 200,
      data: {
        resultUrl,
        folder
      }
    });
 } catch (err) {
   res.err('请检查目录名是否正确')
 }
}

// 新建目录处理
const addFolder = async (req,res) => {
  const folderName = req.body.folder
  if(!folderName) return res.err('请输入目录')

  try {
      // 检查目录是否存在
      const resultCheck = await checkFolderExists(folderName)
      if (resultCheck.res) return res.err('目录已存在')

      // 获取绝对路径
      const resultPathRootOld = checkPath.checkPathRoot(folderName)
      await fs.mkdir(resultPathRootOld.resolvedPath, { recursive: false }); // recursive,true:没有上级目录则上级目录一起创建,flase:没有上级目录,不创建文件

      res.send({
        status: 200,
        message: '创建目录成功'
      });
  } catch (error) {
    res.err('创建目录失败');
  }
}

// 删除目录处理
const deleteFolder = async (req,res) => {
  if (!req.body.folder) return res.err('请指定目录')
  
  try {
    // 检查目录是否存在
    const resultCheck = await checkFolderExists(req.body.folder)
    if (!resultCheck.res) return res.err('目录不存在')

    await fsExtra.remove(`${baseUploadsPath}/${req.body.folder}`)

    res.send({
      status: 200,
      message: 'ok'
    })

  } catch (error) {
    res.err(`删除目录失败`)
  }
}

// 重命名目录处理
const renameFolder = async (req, res) => {
  const oldName = req.body.oldName
  const newName = req.body.newName

  if (!newName) return res.err('请输入新的目录名');
  
  if (!oldName) return res.err('请指定要更改的目录名');

  // 检查根路径
  const resultPathRootOld = checkPath.checkPathRoot(oldName)
  const resultPathRootNew = checkPath.checkPathRoot(newName)
  if(!resultPathRootOld.isLegal || !resultPathRootNew.isLegal) return res.err('非法路径');


  // 检查路径是否包含子目录
  const resultChild = checkPath.checkPathChild(resultPathRootOld.resolvedPath)
  const resultChildNew = checkPath.checkPathChild(resultPathRootNew.resolvedPath)
  if(resultChild || resultChildNew) return res.err('非法路径');

  try {
    // 检查旧目录是否存在
    const resultCheck = await checkFolderExists(oldName)
    if (!resultCheck.res) return res.err('目录不存在')

    // 检查新目录是否已经存在
    const resultCheckNew = await checkFolderExists(newName)
    if (resultCheckNew.res) return res.err('新目录名已存在')
    
    // 重命名目录
    await fs.rename(resultPathRootOld.resolvedPath, resultPathRootNew.resolvedPath);
    
    res.send({
      status: 200,
      message: '目录重命名成功',
    });
  } catch (error) {
    res.err('目录重命名失败');
  }
};

// 获取目录的名称
export const getAllSubdirectories = async (directoryPath) => {
  // 子目录的名称
  const subdirectories = [];
  
    // 读取指定目录下的所有文件和子目录
    const files = await fs.readdir(directoryPath, { withFileTypes: true });
    // 遍历 files 数组中的每个文件和子目录
    for (const file of files) {
      // 当前项是否是一个子目录
      if (file.isDirectory()) {
        subdirectories.push(file.name);
      }
    }

  return subdirectories;
};

// 获取目录下的文件
export const getFilesInDirectory = async (directoryPath) => {
  try {
    const files = await fs.readdir(directoryPath);
    return files;
  } catch (error) {
    throw new Error(error);
  }
};

export default {
  addFolder,
  getFolder,
  getFolderFile,
  deleteFolder,
  renameFolder,
}