import db from '../db/index.js'
import fs from 'fs/promises';
import {getUserPermissions} from '../router/admin.js'
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import {client,AWS_BUCKET,FileOperator} from '../router_handler/image.js'

/**
 * 检查相册名称是否已存在
 * @param {string} albumName - 要检查的相册名称
 * @returns {boolean} - 相册名称是否已存在
 */
async function isAlbumNameExist(albumName) {
  const querySql = 'SELECT COUNT(*) AS count FROM albums WHERE name = ?'

  try {
    const [queryRes] = await db.query(querySql, [albumName])
    return queryRes[0].count === 1
  } catch (error) {
    console.log(error)
    return false
  }
}

/**
 * 根据相册名称和 ID 检查相册是否存在
 * @param {number} id - 相册 ID
 * @param {string} albumName - 相册名称
 * @returns {Promise<Object|Array>} - 如果相册存在，返回相册信息对象；如果相册不存在或发生错误，返回空数组
 */
export async function queryAlbumNameByID(id, albumName) {
  const querySql = 'SELECT * FROM albums WHERE id = ? AND name = ?';

  try {
    const [queryRes] = await db.query(querySql, [id, albumName]);
    return queryRes;
  } catch (error) {
    console.log(error);
    return [];
  }
}

/**
 * 验证相册权限
 * @param {string} albumCreator - 相册创建者的用户名
 * @param {string} username - 当前用户的用户名
 * @param {number} permissions - 当前用户的权限级别
 * @returns {Promise<boolean>} - 是否有权限
 */
export async function checkAlbumPermission(albumCreator, username, permissions) {
  if (albumCreator === username) {
    return true; // 相册所有者有权限
  } else {
    // 查找相册所有人的权限
    const userPermissions = await getUserPermissions(albumCreator);
    if (userPermissions.length === 0) return false;
    
    // 数字小的权限大
    // 修改者的权限大于相册所有者,允许修改
    if(!(userPermissions[0]?.permissions > permissions) || userPermissions[0]?.permissions == permissions) {
        return false;
      } else {
        return true
      }
  }
};

// 新建相册
const createAlbum = async (req, res) => {
  const { albumName, privacy } = req.body
  const { username } = req.auth

  // if(!albumName || !privacy) return res.err('缺少参数');

  // 查询是否有此相册
  console.log(await isAlbumNameExist(albumName));
  if (await isAlbumNameExist(albumName)) return res.err('相册名称已存在')

  const insertSql = 'INSERT INTO albums SET ?'
  const insertData = {
    name: albumName,
    creator: username,
    privacy,
    file_count: 0,
    storage_location: req.storageType
  }

  try {
    const [insertSqlRes] = await db.query(insertSql, insertData)

    if (insertSqlRes.affectedRows !== 1) return res.err('新建相册失败')

    res.send({ status: 200, message: '新建相册成功' })
  } catch (error) {
    console.log(error)
    res.err('新建相册失败')
  }
}

// 更新相册名称或更改相册为公共/私人
const updateAlbum = async (req, res) => {
  const { id, albumName, newAlbumName, newPrivacy } = req.body;
  const { username, permissions } = req.auth;
  
  if (!newAlbumName && !newPrivacy) return res.err('缺少参数');

  // 检查相册是否存在并拿到信息
  const queryRes = await queryAlbumNameByID(id, albumName);
  if(queryRes.length === 0) return res.err('未匹配到相册');

  // // 查看相册所有人
  // if(queryRes[0].creator !== username) {
  //   // 如果不是本人,查找相册所有人的权限
  //   const userPermissions = await getUserPermissions(queryRes[0].creator);

  //   // if(userPermissions.length === 0) return res.err('无权修改此相册...');

  //   // 数字小的权限大
  //   // 修改者的权限大于相册所有者,允许修改
  //   if(!(userPermissions[0]?.permissions > permissions) || userPermissions[0]?.permissions == permissions) {
  //     return res.err('无权修改此相册');
  //   };
  // };

  // 验证权限,查看相册所有人
  const hasPermission = await checkAlbumPermission(queryRes[0].creator, username, permissions);
  if (!hasPermission) return res.err('无权修改此相册');
  
  // 如果是重命名
  if (newAlbumName && (await isAlbumNameExist(newAlbumName))) return res.err('相册名称已存在');
  // 缺少的参数使用原来的值
  const updateParams = {name: newAlbumName || albumName, privacy: newPrivacy || queryRes[0].privacy};
  const updateSql = 'UPDATE albums SET ? WHERE id = ? AND name = ?';
  const updateData = [updateParams, id, albumName];
  try {
    // 如果更新隐私性，相册内图片也更新隐私性
    if (newPrivacy !== queryRes[0].privacy) {
      const updateImgSql = 'UPDATE images SET privacy = ? WHERE album_name = ?';
      const updateImgData = [newPrivacy, albumName];
      await db.query(updateImgSql, updateImgData);
    }
    // 更新相册信息
    const [updateSqlRes] = await db.query(updateSql, updateData);
    if (updateSqlRes.affectedRows !== 1) return res.err('更新相册失败');
    res.send({ status: 200, message: '更新相册成功' });
  } catch (error) {
    console.log(error);
    res.err('更新相册失败');
  }
}

// 获得相册
const getAlbum = async (req, res) => {

  let querySql;
  let queryRes;
  
  try {
    // const {id, username} = req.auth; 没有登录就没有auth,报错

    // 使用可选链操作符
    const id = req?.auth; 
    const username = req?.auth?.username;

    // 没有登录,只能获取公共相册
    if(!id && !username) {
      querySql = 'SELECT * FROM albums WHERE privacy = "0"';
      [queryRes] = await db.query(querySql);
    } else {
      // 已登录,获取私人及公共的相册
      querySql = 'SELECT * FROM albums WHERE creator = ? OR privacy = "0"';
      [queryRes] = await db.query(querySql, username);
    }

    if (!queryRes.length) return res.err('没有可查看的相册');

    res.send({status: 200, message: '获取相册成功', data: queryRes});

  } catch (error) {
    console.log(error);
    res.err('获取相册失败');
  }
}

// 删除相册,同时删除相册下所有的图片
const deleteAlbum = async (req, res) => {
  const { id, albumName } = req.body;
  const { username, permissions } = req.auth;

  // 检查相册是否存在并拿到信息
  const queryRes = await queryAlbumNameByID(id, albumName);
  if(queryRes.length === 0) return res.err('未匹配到相册');

  // 验证权限
  const hasPermission = await checkAlbumPermission(queryRes[0].creator, username, permissions);
  if (!hasPermission) return res.err('无权删除此相册');

  const deleteSql = 'DELETE FROM albums WHERE id = ? AND name = ?';

  try {
    // 删除数据之前,把该相册下的图片都删除了,相册在数据库中删除后,会自动删除所属该相册图片的数据
    // 找出所属该相册的图片
    const selectSql = 'SELECT name,version_id FROM images WHERE album_name = ?';
    const [selectRes] = await db.query(selectSql,[albumName]);
    console.log('selectRes',selectRes.length);

    // 如果相册没有图片,跳过删除步骤
    if(selectRes.length !== 0) {
      // 根据相册存储类型,执行对应删除操作
      if(queryRes[0].storage_location == 1) {
        // 第三方
        const Objects = selectRes.map(item => {
          return {
            Key: item.name, 
            VersionId: item.version_id
          }
        })
          
        const command = new DeleteObjectsCommand({
          Bucket: AWS_BUCKET,
          Delete: {
            Objects
          },
        });

        const deletedRes = await client.send(command);
        if(deletedRes.$metadata.httpStatusCode !== 200) return res.err('删除相册失败');

      } else {
        // Promise.all在所有异步操作完成后获取结果
        // 检测文件是否存在,如果不存在,记录为null
        const fileList = await Promise.all(selectRes.map(async item => {
          try {
            await fs.access(`${FileOperator.folderPath}${item.name}`);
            return item.name;
          } catch (err) {
            if (err.code === 'ENOENT') {
              console.log('文件不存在');
              return null;
            } else {
              console.error(err);
              return null;
            }
          }
        }));

        const deletedRes = await FileOperator.deleteMultipleFiles(fileList);
        if(!deletedRes) return res.err('删除相册失败');
      }
    }
   
    const [deleteSqlRes] = await db.query(deleteSql, [id, albumName]);
    if (deleteSqlRes.affectedRows !== 1) return res.err('删除相册失败');

    res.send({ status: 200, message: '删除相册成功' });

  } catch (error) {
    console.log(error);
    res.err('删除相册失败');
  }
}

export default {
  createAlbum,
  updateAlbum,
  getAlbum,
  deleteAlbum
}
