import db from '../db/index.js'
import bcrypt from 'bcryptjs'
import jwt  from 'jsonwebtoken' // 生成 Token 字符串
import 'dotenv/config'
const jwtSecretKey = process.env.JWT_SECRETKEY
const expiresIn = process.env.TOKEN_EXPIRESIN


// 更新用户信息
const updateUserinfo = async (req,res) => {
  // req 对象上的 auth 属性，是 Token 解析成功，express-jwt 中间件帮我们挂载上去的
  let {username, id} = req.auth
  console.log(req.body);
  // 用户更新信息后，token中还是以前的信息，如果再次更改，使用body中的username
  // username = req.body.username || username;
  try {
    const querySql = 'select * from user where id= ? and username = ?'

    const changenameSql = 'update user set ? where id = ? and username = ?'
    const [changenameRes] = await db.query(changenameSql,[req.body, id, username])
    if(changenameRes.affectedRows !== 1) return res.err('更新信息失败')

    // 查询新的信息
    const [updateQueryRes] = await db.query(querySql,[id,username])

    // 快速剔除 密码(敏感信息)
    delete updateQueryRes[0].password
    const user = updateQueryRes[0]

    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, jwtSecretKey, {expiresIn})

    res.send({
      status: 200,
      message: '更新信息成功',
      data: {
        user,
        token: `Bearer ${tokenStr}`
      }
    })
  } catch (error) {
    console.log(error);
    res.err('更新信息失败')
  }
}

// 更改密码
const updatePassword = async (req, res) => {
  const {oldPwd, newPwd} = req.body
  if(!oldPwd) return res.err('请输入旧密码')
  if(!newPwd) return res.err('请输入新密码')

  let {username, id} = req.auth
  username = req.body.username || username;

  try {
    const querySql = 'select * from user where id= ? and username = ?'
    const [queryRes] = await db.query(querySql,[id,username])

    if (queryRes.length !== 1) return res.err('修改密码失败')

    // 判断提交的旧密码是否正确
    // 可使用 bcrypt.compareSync(提交的密码，数据库中的密码) 方法验证密码是否正确
    // compareSync() 函数的返回值为布尔值，true 表示密码正确，false 表示密码错误
    const compareResult = bcrypt.compareSync(oldPwd, queryRes[0].password)
    if (!compareResult) return res.err('原密码错误')

    // 更新数据库密码
    const updatePwdSql = `update user set password= ? where id= ? and username = ?`
    const bcrype_password = bcrypt.hashSync(newPwd, 10)

    const [updatePwdRes] = await db.query(updatePwdSql,[bcrype_password,id,username])
    if(updatePwdRes.affectedRows !== 1) return res.err('修改密码失败')

    // 查询新的信息
    const [updateQueryRes] = await db.query(querySql,[id,username])

    // 快速剔除 密码(敏感信息)
    delete updateQueryRes[0].password
    const user = updateQueryRes[0]
    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, jwtSecretKey, {expiresIn})

    res.send({
      status: 200,
      message: '修改密码成功',
      data: {
        token: 'Bearer ' + tokenStr,
        user
      }
    })
  } catch (error) {
    res.err('修改密码失败')
    console.log(error);
  }
}

// 注销账号1,此接口直接删除用户
const deleteUser = async (req,res) => {
  let {username, id, email} = req.auth
  username = req.body.username || username;
  email = req.body.email || email;
  
  if(!username && !email) return res.err('请输入用户名或邮箱')

  try {
    let deleteRes
    if (username) {
      // 使用用户名
      const deleteByNammeSql = 'delete from user where id= ? and username = ?'
      deleteRes = await db.query(deleteByNammeSql, [id,username]);
    } else {
      // 使用邮箱
      const deleteByEmailSql = 'delete from user where id= ? and email = ?';
      deleteRes = await db.query(deleteByEmailSql, [id,email]);
    }
    if(deleteRes[0].affectedRows !== 1) return res.err('注销账号失败')

    res.send({
      status: 200,
      message: '注销账号成功'
    })

  } catch (error) {
    res.err('注销账号失败')
    console.log(error);
  }
}

// 注销账号2,此接口更改用户状态，不删除用户
const updateUserStatus = async (req,res) => {
  let {username, id } = req.auth
  username = req.body.username || username;
  
  if(!username) return res.err('请输入用户名')

  try {
    const updateByNammeSql = 'update user set status = "0" where id= ? and username = ?'
    const [updateRes] = await db.query(updateByNammeSql, [id,username]);
    if(updateRes.affectedRows !== 1) return res.err('注销账号失败')

    res.send({
      status: 200,
      message: '注销账号成功'
    })

  } catch (error) {
    res.err('注销账号失败')
    console.log(error);
  }
}

export default {
  updateUserinfo,
  updatePassword,
  deleteUser,
  updateUserStatus
}