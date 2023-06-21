import db from '../db/index.js'

// 获取用户
const getUser = async (req,res) => {
  try {
    const querySql = 'select id,username,email,regdate,power,status from user where status = "1"'
    const [queryRes] = await db.query(querySql)

    res.send({
      status: 200,
      message: '获取用户成功',
      data: {
        userList: queryRes
      }
    })

  } catch (error) {
    res.err('获取用户失败')
  }
}

// 获取已注销用户
const getSignOutUser = async (req,res) => {
  try {
    const querySql = 'select id,username,email,regdate,power,status from user where status = "0"'
    const [queryRes] = await db.query(querySql)
    console.log(queryRes);
    res.send({
      status: 200,
      message: '获取已注销用户成功',
      data: {
        userList: queryRes
      }
    })

  } catch (error) {
    res.err('获取已注销用户失败')
  }
}

// 清空已注销用户
const deleteSignOutUser = async (req,res) => {
  try {
      const deleteSql = 'delete from user where status = "0"'
      await db.query(deleteSql);

    res.send({
      status: 200,
      message: '清空已注销账号成功'
    })

  } catch (error) {
    res.err('清空已注销账号失败')
    console.log(error);
  }
}

// 更改权限(仅超级管理员可以更改)
const updatePower = async (req,res) => {
  const {username,id} = req.auth
  const {setPower,setUserName, setId} = req.body
  if(!setPower || setPower == 1) return res.err('请选择要更改的权限等级')
  if(!setUserName) return res.err('请选择用户')
  if(!setId) return res.err('缺少用户ID')

  try {
    const querySql = 'select power from user where username = ? and id = ?'
    const [queryRes] = await db.query(querySql,[username,id])
    // 如果不是超级管理员
    if(queryRes[0].power != 1) return res.err('你无权进行此操作',403)
    if(queryRes[0].power == 1 && setPower != 1) return res.err('超级管理员不可降级',403)

    const setPowerSql = 'update user set power = ? where username = ? and id = ?'
    const [setPowerRes] = await db.query(setPowerSql,[setPower,setUserName,setId])
    if(setPowerRes.affectedRows !== 1) return res.err('更改权限失败')

    const newDataSql = 'select id,username,email,power,status from user where username = ? and id = ?'
    const [newDataRes] = await db.query(newDataSql,[setUserName,setId])

    res.send({
      status: 200,
      message: '更改权限成功',
      data: {
        userList: newDataRes
      }
    })

  } catch (error) {
    res.err('更改权限失败')
  }
}

// 获取可管理权限的接口
const getInterface = async (req,res) => {
  try {
    const querySql = 'select * from interface'
    const [queryRes] = await db.query(querySql)
    res.send({
      status: 200,
      message: '获取接口成功',
      data: {
        interace: queryRes
      }
    })
  } catch (error) {
    res.err('获取接口失败')
  }
}

// 修改操作所需的权限
const changeInterfacePower = async (req,res) => {
  const {id, interfaceName, setPower} = req.body
  if(!id) return res.err('请指定接口id')
  if(!interfaceName) return res.err('请指定接口')
  if(!setPower) return res.err('请选择要更改的权限等级')

  try {
    const changeSql = 'update interface set power = ? where id = ? and interface = ?'
    const [changeRes] = await db.query(changeSql,[setPower,id,interfaceName])
    console.log(changeRes);
    if(changeRes.affectedRows !== 1) return res.err('更改权限失败')

    const querySql = 'select * from interface where id = ? and interface = ?'
    const [queryRes] = await db.query(querySql, [id,interfaceName])

    res.send({
      status: 200,
      message: '更改权限成功',
      data: {
        interace: queryRes
      }
    })

  } catch (error) {
    res.err('更改权限失败')
  }
}

export default {
  getUser,
  getSignOutUser,
  deleteSignOutUser,
  updatePower,
  getInterface,
  changeInterfacePower
}