import db from '../db/index.js'
import {initializeStorageType} from '../router/album.js'

// 获取用户
const getUser = async (req,res) => {
  try {
    const querySql = 'SELECT id,username,email,registration_time,logout_time,permissions,status FROM user WHERE status = "1"';
    const [queryRes] = await db.query(querySql);

    res.send({
      status: 200,
      message: '获取用户成功',
      data: {
        userList: queryRes
      }
    });

  } catch (error) {
    console.log(error);
    res.err('获取用户失败', 500);
  }
}

// 获取已注销用户
const getSignOutUser = async (req,res) => {
  try {
    const querySql = 'SELECT id,username,email,permissions,registration_time,logout_time,status FROM user WHERE status = "0"';
    const [queryRes] = await db.query(querySql);
    // console.log(queryRes);
    res.send({
      status: 200,
      message: '获取已注销用户成功',
      data: {
        userList: queryRes
      }
    });

  } catch (error) {
    console.log(error);
    res.err('获取已注销用户失败', 500)
  }
}

// 清空已注销用户
const deleteSignOutUser = async (req,res) => {
  try {
      const deleteSql = 'DELETE FROM user WHERE status = "0"';
      await db.query(deleteSql);

    res.send({
      status: 200,
      message: '清空已注销账号成功'
    });

  } catch (error) {
    res.err('清空已注销账号失败', 500);
    console.log(error);
  }
}

// 删除注销账号的某个用户
const deleteUser = async (req,res) => {
  const {delUserName, id} = req.body;
  
  // if(!id) return res.err('请输入ID')
  // if(!delUserName) return res.err('请输入用户名')

  try {   
      const deleteByNammeSql = 'DELETE FROM user WHERE id= ? AND username = ? AND status = "0"';
      const deleteRes = await db.query(deleteByNammeSql, [id,delUserName]);
    
    if(deleteRes[0].affectedRows !== 1) return res.err('删除账号失败');

    res.send({
      status: 200,
      message: '删除账号成功'
    })

  } catch (error) {
    res.err('删除账号失败', 500)
    console.log(error);
  }
}

// 恢复注销账号的某个用户
const restoreUser = async (req,res) => {
  const {restoreUser, id} = req.body
  
  // if(!id) return res.err('请输入ID')
  // if(!restoreUser) return res.err('请输入用户名')

  try {   
      const updateSql = 'UPDATE user SET status = "1" WHERE id= ? AND username = ? AND status = "0"'
      const updateRes = await db.query(updateSql, [id,restoreUser]);
      // console.log('updateRes',updateRes[0],updateRes[0].affectedRows);
    if(updateRes[0].affectedRows !== 1) return res.err('恢复账号失败');

    res.send({
      status: 200,
      message: '恢复账号成功'
    })

  } catch (error) {
    res.err('恢复账号失败', 500)
    console.log(error);
  }
}

// 更改权限(仅超级管理员可以更改)
const updatePermissions = async (req,res) => {
  const {username,id} = req.auth;
  const {setPower,setUserName, setId} = req.body;

  // if(!setPower) return res.err('请选择要更改的权限等级')
  // if(setPower == 1) return res.err('不可获取超级权限')
  // if(!setUserName) return res.err('请选择用户')
  // if(!setId) return res.err('缺少用户ID')

  try {
    const querySql = 'SELECT permissions,username FROM user WHERE username = ? AND id = ?';
    const [queryRes] = await db.query(querySql,[username,id]);
    // 如果不是超级管理员
    if(queryRes[0].permissions != 1) return res.err('权限不足',403);
    // 如果权限等于1,且发起改动人的username等于setUserName,且降级,不继续操作(超级管理员自降权限)
    if(queryRes[0].permissions == 1 && queryRes[0].username == setUserName && setPower != 1) return res.err('超级管理员不可降级',403);

    const setPowerSql = 'UPDATE user SET permissions = ? WHERE username = ? AND id = ?';
    const [setPowerRes] = await db.query(setPowerSql,[setPower,setUserName,setId]);
    if(setPowerRes.affectedRows !== 1) return res.err('更改权限失败');

    // const newDataSql = 'SELECT id,username,email,permissions,status FROM user WHERE username = ? AND id = ?';
    // const [newDataRes] = await db.query(newDataSql,[setUserName,setId]);

    res.send({
      status: 200,
      message: '更改权限成功',
      // data: {
      //   userList: newDataRes
      // }
    })

  } catch (error) {
    res.err('更改权限失败', 500)
  }
}

// 获取可管理权限的接口
const getInterface = async (req,res) => {
  try {
    const querySql = 'SELECT * FROM interface';
    const [queryRes] = await db.query(querySql);
    res.send({
      status: 200,
      message: '获取接口成功',
      data: {
        interace: queryRes
      }
    })
  } catch (error) {
    res.err('获取接口失败', 500)
  }
}

// 修改操作所需的权限
const changeInterfacePower = async (req,res) => {
  const {id, interfaceName, setPower} = req.body;

  // if(!id) return res.err('请指定接口id')
  // if(!interfaceName) return res.err('请指定接口')
  // if(!setPower) return res.err('请选择要更改的权限等级')

  try {
    const changeSql = 'UPDATE interface SET required_permissions = ? WHERE id = ? AND name = ?';
    const [changeRes] = await db.query(changeSql,[setPower,id,interfaceName]);
    // console.log(changeRes);
    if(changeRes.affectedRows !== 1) return res.err('更改权限失败');

    // const querySql = 'SELECT * FROM interface WHERE id = ? AND name = ?';
    // const [queryRes] = await db.query(querySql, [id,interfaceName]);

    res.send({
      status: 200,
      message: '更改权限成功',
      // data: {
      //   interace: queryRes
      // }
    })

  } catch (error) {
    res.err('更改权限失败',500)
  }
}

// 获取系统设置
const getSystemSet =  async (req,res) => {
  const querySql = 'SELECT * FROM systemset';
  try {
    const [queryRes] = await db.query(querySql);

    if(queryRes.length === 0) return res.err('获取系统设置失败');

    res.send({
      status: 200,
      message: '获取系统设置成功',
      data: {
        systemset: queryRes[0]
        }
      });

  } catch (error) {
    console.log(error);
    res.err('获取系统设置失败',500)
  }
}

// 更改设置,更改存储类型,但之前建的相册还是使用之前的存储类型
const changeSystemSet = async (req,res) => {
  const {storage_type, cloud_disk_capacity, local_disk_capacity} = req.body;
  console.log(storage_type, cloud_disk_capacity, local_disk_capacity);

  if(!storage_type && !cloud_disk_capacity && !local_disk_capacity) return res.err('参数错误');

  try {
    const changeSql = 'UPDATE systemset SET ?';
    const [changeRes] = await db.query(changeSql,[req.body]);
    if(changeRes.affectedRows !== 1) return res.err('更改设置失败');

    // 重新查询存储类型
    initializeStorageType();

    res.send({
      status: 200,
      message: '更改设置成功'
    })
    
  } catch (error) {
    console.log(error);
    res.err('更改设置失败',500)
  }
}

// 查看所有相册
const getAllAlbum = async (req, res) => {
  const querySql = 'SELECT * FROM albums';

  try {
    const [queryRes] = await db.query(querySql);

    res.send({
      status: 200,
      message: '获取相册成功',
      data: {
        alnums: queryRes
        }
      });
    
  } catch (error) {
    console.log(error);
    res.err('获取相册失败',500);
  }
}

// 查看所有图片
const getAllImage = async (req, res) => {
  // batchSize:每次查询的数量,默认30, offset查询起始位置,默认0开始
  const {batchSize, offset} = req.query;
  console.log(batchSize, offset);
  const querySql = 'SELECT * FROM images ORDER BY id DESC LIMIT ?, ?';

  try {
    const [queryRes] = await db.query(querySql, [offset, batchSize]);

    // 下一次查询的起始位置为本此查询到的数量+上次的偏移量
    const nextOffset = offset + queryRes.length;

    res.send({
      status: 200,
      message: '获取图片成功',
      count: queryRes.length,
      nextOffset,
      data: {
        images: queryRes
        }
      });
    
  } catch (error) {
    console.log(error);
    res.err('获取图片失败',500);
  }
}

export default {
  getUser,
  getSignOutUser,
  deleteSignOutUser,
  updatePermissions,
  getInterface,
  changeInterfacePower,
  deleteUser,
  restoreUser,
  getSystemSet,
  changeSystemSet,
  getAllAlbum,
  getAllImage
}