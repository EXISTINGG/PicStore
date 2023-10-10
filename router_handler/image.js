import db from '../db/index.js'
import fs from 'fs/promises';
import axios from 'axios'
import path from 'path'
import {fileTypeFromBuffer} from 'file-type';
import { S3Client, PutObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import {queryAlbumNameByID,checkAlbumPermission} from '../router_handler/album.js';

const SERVER_ADDRESS = process.env.SERVER_ADDRESS;
// 获取AWS存储桶名称
export const AWS_BUCKET = process.env.AWS_BUCKET;
// 获取AWS端点URL
const AWS_ENDPOINT_URL = process.env.AWS_ENDPOINT_URL;
// 获取AWS区域
const AWS_REGION = process.env.AWS_REGION;

// 创建S3客户端
// 传入AWS端点URL和区域
export const client = new S3Client({ endpoint: AWS_ENDPOINT_URL,region: AWS_REGION })

export class FileOperator {
  static folderPath = './uploads/';
  static folder = 'uploads';

  // 写入文件
  static async writeFile(filename,fileBuffer) {
    try {
      await fs.writeFile(`${FileOperator.folderPath}${filename}`, fileBuffer);
      return true;
    } catch (err) {
      console.error('写入文件时出错:', err);
      return false;
    }
  }

  // 删除文件
  static async deleteFile(filename) {
    try {
      await fs.unlink(`${FileOperator.folderPath}/${filename}`);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // 删除多个文件
  static async deleteMultipleFiles(fileList) {
    console.log(1111, fileList);
    let deleteRes = true; // 初始化为 true，表示删除成功
    // for...of语句遇到return会立即终止循环
    for (const file of fileList) {
      if (file !== null) {
        console.log('删除文件:', file);
        const result = await FileOperator.deleteFile(file);
        if (!result) {
          deleteRes = false; // 如果删除失败，将 deleteRes 设置为 false
          console.log('删除失败');
        }
      }
    }
    return deleteRes; // 在循环结束后返回结果
  }
};

/**
 * 在处理图像之前检查相册权限和文件类型。
 *
 * @param {Object} albumInfo - 相册信息。
 * @param {Buffer} buffer - 图像缓冲区。
 * @param {string} username - 用户名。
 * @param {string} permissions - 用户权限。
 * @param {Object} res - Express 响应对象。
 * @returns {Promise<boolean>} - 返回一个带有布尔值的 Promise，指示检查是否通过。
 */
async function checkPermissionAndFileType(albumInfo, buffer, username, permissions, res) {
  if (albumInfo.privacy == 1) {
    const hasPermission = await checkAlbumPermission(albumInfo.creator, username, permissions);
    if (!hasPermission) return res.err('无权使用此相册');
  }

  const fileTypeRes = await fileTypeFromBuffer(buffer);

  if (!fileTypeRes || !fileTypeRes.mime.startsWith('image/')) {
    return res.err('请上传图片类型文件');
  }

  return true;
}

/**
 * 根据相册信息将图像保存到适当的存储位置。
 *
 * @param {Buffer} buffer - 图像缓冲区。
 * @param {string} size - 图像的文件大小。
 * @param {string} mimetype - 图像的文件类型。
 * @param {string} filename - 图像文件名。
 * @param {Object} albumInfo - 相册信息。
 * @param {string} username - 用户名。
 * @param {string} currentTime - 时间戳。
 * @param {Object} res - Express 响应对象。
 * @returns {Promise<boolean>} - 返回一个带有布尔值的 Promise，指示图像是否成功保存。
 */
async function saveImageToStorage(buffer,size, mimetype, filename, albumInfo, username,currentTime, res) {
  const insertSql = 'INSERT INTO images SET ?';

  const insertData = {
    name: filename,
    uploader: username,
    privacy: albumInfo.privacy,
    file_size: size,
    upload_date: currentTime,
    storage_location: albumInfo.storage_location,
    album_name: albumInfo.name,
  };

  try {
    if (albumInfo.storage_location == 1) {
      const params = {
        Bucket: AWS_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: mimetype,
      }

      const resData = await client.send(new PutObjectCommand(params))
      if (resData.$metadata.httpStatusCode !== 200) return res.err('上传出错O_o', 500);

      const url = `${AWS_ENDPOINT_URL}/${AWS_BUCKET}/${filename}`;
      insertData.file_url = url;
      insertData.version_id = resData.VersionId;

      const [insertRes] = await db.query(insertSql, insertData);
      if (insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);

      return {isSuccess: true, insertData};
    } else {
      const writeFileRes = await FileOperator.writeFile(filename, buffer);
      if (!writeFileRes) return res.err('上传出错O_o', 500);

      const url = `${SERVER_ADDRESS}/${FileOperator.folder}/${filename}`;
      insertData.file_url = url;
      insertData.version_id = 0;

      const [insertRes] = await db.query(insertSql, insertData);
      if (insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);

      return {isSuccess: true, insertData};
    }
  } catch (error) {
    console.log(error);
    res.err('上传出错O_o', 500);
    return {isSuccess: false};
  }
}

const saveImage = async (req, res) => {
  if (!req.file) return res.err('没有文件');

  const { originalname, buffer, size, mimetype } = req.file;
  const { id, album_name } = req.body;
  const { username, permissions } = req.auth;
  const currentTime = Date.now();

  if (!id || !album_name || !username || !permissions) return res.err('参数错误');

  const filename = `${currentTime}${decodeURIComponent(originalname.replace(/\s/g, ''))}`;

  console.log(filename, currentTime, username, album_name);

  const queryRes = await queryAlbumNameByID(id, album_name);
  if (queryRes.length === 0) return res.err('未匹配到相册');

  if (await checkPermissionAndFileType(queryRes[0], buffer, username, permissions, res)) {
    const saveRes = await saveImageToStorage(buffer, size, mimetype, filename, queryRes[0], username,currentTime, res)
    if (saveRes.isSuccess) {
      res.send({ status: 200, message: '上传成功', data: saveRes.insertData });
    }
  }
};

const saveNetImage = async (req, res) => {
  const { imgUrl, id, album_name } = req.body;
  const { username, permissions } = req.auth;

  try {
    const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });

    if (response.status !== 200) return res.err('获取图片失败');

    const currentTime = Date.now();
    const size = response.headers['content-length'];
    const mimetype = response.headers['content-type'];
    const buffer = response.data;
    const filename = `${currentTime}${decodeURIComponent(path.basename(imgUrl).replace(/\s/g, ''))}`;

    console.log(filename, currentTime, username, album_name);

    const queryRes = await queryAlbumNameByID(id, album_name);
    if (queryRes.length === 0) return res.err('未匹配到相册');

    if (await checkPermissionAndFileType(queryRes[0], buffer, username, permissions, res)) {
      const saveRes = await saveImageToStorage(buffer,size, mimetype, filename, queryRes[0], username,currentTime, res)
      if (saveRes.isSuccess) {
        res.send({ status: 200, message: '上传成功', data: saveRes.insertData });
      }
    }
  } catch (error) {
    console.log(error);
    res.err('保存出错O_o', 500);
  }
};

// const saveImage = async (req,res) => {
//   if(!req.file) return res.err('没有文件');

//   const {originalname,buffer,size,mimetype} = req.file;
//   const {id,album_name} = req.body;
//   const {username,permissions} = req.auth;
//   // const storageType = req.storageType
//   const currentTime = Date.now();

//   if(!id || !album_name || !username || !permissions) return res.err('参数错误')

//   // 加上时间戳,去除文件名的所有空格
//   const filename = `${currentTime}${decodeURIComponent(originalname.replace(/\s/g,''))}`

//   console.log(currentTime, username, album_name, originalname);

//   // 检查相册是否存在并拿到信息
//   const queryRes = await queryAlbumNameByID(id, album_name);
//   if(queryRes.length === 0) return res.err('未匹配到相册');

//   // 检测相册是公共还是私人
//   // 如果是私人的
//   if(queryRes[0].privacy == 1) {
//     // 验证权限
//     const hasPermission = await checkAlbumPermission(queryRes[0].creator, username, permissions);
//     if (!hasPermission) return res.err('无权使用此相册');
//   }

//   try {
//     // 检测是否是图片类型
//     const fileTypeRes = await fileTypeFromBuffer(buffer);

//     if (!fileTypeRes || !fileTypeRes.mime.startsWith('image/')) {
//       return res.err('请上传图片类型文件');
//     };

//     const insertSql = 'INSERT INTO images SET ?';
      
//     const insertData = {
//       name: filename,
//       uploader: username,
//       privacy: queryRes[0].privacy,
//       file_size: size,
//       upload_date: currentTime,
//       // storage_location:storageType,
//       storage_location:queryRes[0].storage_location, // 存储在相册所属的存储方式,以便管理
//       album_name,
//     };

//     // 如果是云存储
//     if(queryRes[0].storage_location == 1) {

//       const params = {
//         Bucket: AWS_BUCKET, // 存储桶名称
//         Key: filename, // 文件在存储桶中的名字  
//         Body: buffer, // 使用文件内容
//         ContentType: mimetype, // 设置文件的内容类型
//       }

//       const resData = await client.send(new PutObjectCommand(params))
//       if(resData.$metadata.httpStatusCode !== 200) return res.err('上传出错O_o', 500);

//       const url = `${AWS_ENDPOINT_URL}/${AWS_BUCKET}/${filename}`;

//       // 添加数据
//       insertData.file_url = url;
//       insertData.version_id = resData.VersionId;
//       // 写入数据库
//       const [insertRes] = await db.query(insertSql,insertData);
//       if(insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);

//       return res.send({status: 200,message: '上传成功', data: insertData});

//     } else {
//       // 文件写入
//       const writeFileRes = await FileOperator.writeFile(filename,buffer);
//       if(!writeFileRes) return res.err('上传出错O_o', 500);

//       const url = `${SERVER_ADDRESS}/${FileOperator.folder}/${filename}`;

//       // 添加数据
//       insertData.file_url = url;
//       insertData.version_id = 0;
//       // 写入数据库
//       const [insertRes] = await db.query(insertSql,insertData);
//       if(insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);
      
//       return res.send({status: 200,message: '上传成功', data: insertData});
//     }
//   } catch (error) {
//     console.log(error);
//     res.err('上传出错O_o', 500)
//   }
// };

//#region 
// 保存网络图片
// const saveNetImage = async  (req, res) => {
//   const {imgUrl, id, album_name} = req.body;
//   const {username,permissions} = req.auth;

//   try {
//     // 发起请求
//     const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
    
//     if(response.status !== 200) return res.err('获取图片失败');

//     const currentTime = Date.now();
//     // 文件大小
//     const size = response.headers['content-length'];
//     // 文件类型
//     const mimetype = response.headers['content-type'];
//     // 文件buffer
//     const buffer = response.data;

//     // 提取文件名,加上时间戳,去除文件名的所有空格
//     const filename = `${currentTime}${decodeURIComponent(path.basename(imgUrl).replace(/\s/g,''))}`

//     console.log(filename,currentTime, username, album_name);

//     // 检查相册是否存在并拿到信息
//     const queryRes = await queryAlbumNameByID(id, album_name);
//     if(queryRes.length === 0) return res.err('未匹配到相册');

//     // 检测相册是公共还是私人
//     // 如果是私人的
//     if(queryRes[0].privacy == 1) {
//       // 验证权限
//       const hasPermission = await checkAlbumPermission(queryRes[0].creator, username, permissions);
//       if (!hasPermission) return res.err('无权使用此相册');
//     }

//     // 检测是否是图片类型
//     const fileTypeRes = await fileTypeFromBuffer(buffer);

//     if (!fileTypeRes || !fileTypeRes.mime.startsWith('image/')) {
//       return res.err('请上传图片类型文件');
//     };

//     const insertSql = 'INSERT INTO images SET ?';
      
//     const insertData = {
//       name: filename,
//       uploader: username,
//       privacy: queryRes[0].privacy,
//       file_size: size,
//       upload_date: currentTime,
//       // storage_location:storageType,
//       storage_location:queryRes[0].storage_location, // 存储在相册所属的存储方式,以便管理
//       album_name,
//     };

//     // 如果是云存储
//     if(queryRes[0].storage_location == 1) {

//       const params = {
//         Bucket: AWS_BUCKET, // 存储桶名称
//         Key: filename, // 文件在存储桶中的名字  
//         Body: buffer, // 使用文件内容
//         ContentType: mimetype, // 设置文件的内容类型
//       }

//       const resData = await client.send(new PutObjectCommand(params))
//       if(resData.$metadata.httpStatusCode !== 200) return res.err('上传出错O_o', 500);

//       const url = `${AWS_ENDPOINT_URL}/${AWS_BUCKET}/${filename}`;

//       // 添加数据
//       insertData.file_url = url;
//       insertData.version_id = resData.VersionId;
//       // 写入数据库
//       const [insertRes] = await db.query(insertSql,insertData);
//       if(insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);

//       return res.send({status: 200,message: '上传成功', data: insertData});

//     } else {
//       // 文件写入
//       const writeFileRes = await FileOperator.writeFile(filename,buffer);
//       if(!writeFileRes) return res.err('上传出错O_o', 500);

//       const url = `${SERVER_ADDRESS}/${FileOperator.folder}/${filename}`;

//       // 添加数据
//       insertData.file_url = url;
//       insertData.version_id = 0;
//       // 写入数据库
//       const [insertRes] = await db.query(insertSql,insertData);
//       if(insertRes.affectedRows !== 1) return res.err('上传出错O_o', 500);
      
//       return res.send({status: 200,message: '上传成功', data: insertData});
//     }

//   } catch (error) {
//     console.log(error);
//     res.err('保存出错O_o', 500);
//   }
// }

const deleteImage = async (req, res) => {
  const {id,name} = req.body;
  const {username, permissions} = req.auth;

  try {
    // 获取图片
    const querySql = `SELECT * FROM images WHERE id = ? AND name = ?`;
    const [queryRes] = await db.query(querySql, [id,name]);
    
    if(queryRes.length !== 1) return res.err('未找到图片');
    
    // 验证权限
    const hasPermission = await checkAlbumPermission(queryRes[0].uploader, username, permissions)
    
    if (!hasPermission) return res.err('无权删除此图片');

    const deleteSql = `DELETE FROM images WHERE id = ? AND name = ?`;
    const deleteData = [id,name];

    // 图片存储在本机还是云存储
    if(queryRes[0].storage_location == 1) {

      const params = {
        Bucket: AWS_BUCKET,
        Key: name,
        // VersionId: 直接删除,没有则标记删除
        VersionId: queryRes[0].version_id
      };

      const resData = await client.send(new DeleteObjectCommand(params));
      if(resData.$metadata.httpStatusCode !== 204) return res.err('删除失败O_o');

      const [deleteRes] = await db.query(deleteSql, deleteData);
      if(deleteRes.affectedRows !== 1) return res.err('文件已删除,但删除记录时发生错误,请联系管理员');

      return res.send({status: 200,message: '删除成功'});
    } else {
      // 本机
      const deleteFileRed = await FileOperator.deleteFile(name);
      if(!deleteFileRed) return res.err('删除失败O_o');

      const [deleteRes] = await db.query(deleteSql, deleteData);
      if(deleteRes.affectedRows !== 1) return res.err('文件已删除,但删除记录时发生错误,请联系管理员');

      return res.send({status: 200,message: '删除成功'});
    }
  } catch (error) {
    console.log(error);
    res.err('删除出错O_o', 500);
  }
};

// 获取相册下的图片
const getImage = async (req, res) => {
  try {
    // batchSize:每次查询的数量,默认30, offset查询起始位置,默认0开始
    const {id: albumId, name, batchSize, offset} = req.query;
    const id = req?.auth;
    const username = req?.auth?.username;
    const permissions = req?.auth?.permissions;

    // 检查相册是否存在
    const queryRes = await queryAlbumNameByID(albumId,name);
    
    if(queryRes.length === 0) return res.err('该相册不存在');
    
    // 私人相册
    if(queryRes[0].privacy == 1) {
      // 没有登录
      if(!id || !username || !permissions) return res.err('请先登录');

      // 查看是否有权限
      const checkRes = await checkAlbumPermission(queryRes[0].creator,username,permissions);

      if(!checkRes) return res.err('没有权限');
    };

    // const querySql = 'SELECT * FROM images WHERE album_name = ?';
    // const [queryImgRes] = await db.query(querySql, [name]);
    const querySql = 'SELECT * FROM images WHERE album_name = ? LIMIT ?, ?';
    const [queryImgRes] = await db.query(querySql, [name, offset, batchSize]);

    // 没有图片
    if(queryImgRes.length === 0) return res.send({status: 200,message: '没有更多了', count: 0, nextOffset: offset, data: []});

    // 下一次查询的起始位置为本此查询到的数量+上次的偏移量
    const nextOffset = offset + queryImgRes.length;

    return res.send({status: 200,message: '获取成功', count: queryImgRes.length, nextOffset, data: queryImgRes});
    
  } catch (error) {
    console.log(error);
    res.err('获取出错O_o', 500);
  }
}

/**
 * 获取一张随机的公共图片
 * @returns {Promise<Object>} 包含查询结果的Promise对象
 */
async function getRandomImage() {
  try {
    // 随机获取一张公共图
    const querySql = 'SELECT file_url FROM images WHERE privacy = "1" ORDER BY RAND() LIMIT 1';

    const [queryRes] = await db.query(querySql);

    return queryRes;

  } catch (error) {
    console.log(error);
    return [];
  }
}

// 随机图
const randomImage = async (req, res) => {

  const queryRes = await getRandomImage();

  if(queryRes.length === 0) return res.err('没有图片');

  // return res.send({status: 200,message: '获取成功', data: queryRes});
  return res.send(`
  <style>
    body {
      margin: 0;
    }
  </style>
  <div style="max-width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center; background-color: rgb(14, 14, 14);">
    <img src="${queryRes[0].file_url}" style="max-width: 100%; max-height: 100%;"></img>
  </div>
  `);
}

// 随机图,返回图片链接
const randomImageUrl = async (req, res) => {
  const queryRes = await getRandomImage();

  if(queryRes.length === 0) return res.err('没有图片');

  return res.send({status: 200,message: '获取成功', data: queryRes[0].file_url});
}

export default {
  saveImage,
  deleteImage,
  getImage,
  saveNetImage,
  randomImage,
  randomImageUrl
};