import db from '../db/index.js';
import bcrypt from 'bcryptjs';
import jwt  from 'jsonwebtoken'; // 生成 Token 字符串
import 'dotenv/config';
import {generateCode,transport} from '../router_handler/user.js'

const user = process.env.EMAIL_USER;
const jwtSecretKey = process.env.JWT_SECRETKEY;
const expiresIn = process.env.TOKEN_EXPIRESIN;

const emailChangeCodeMap = {}; // 使用对象来存储更换邮箱的验证码，以邮箱为键
const emailChangeCodeExpiryMap = {}; // 使用对象来存储更换邮箱验证码的有效期，以邮箱为键

/**
 * 检查邮箱是否存在于用户表中
 * @param {string} email - 邮箱地址
 * @returns {Promise<Object>} - 返回一个 Promise 对象，解析为一个包含 isExist 和 queryRes 属性的对象。
 * - isExist: 如果邮箱存在，则为 true；否则为 false。
 * - queryRes: 如果邮箱存在，则为查询结果的第一个对象；否则为 undefined。
 */
export async function checkEmail(email) {
  // const querySql = 'SELECT COUNT(*) AS count FROM user WHERE email = ?';
  const querySql = 'SELECT * FROM user WHERE email = ?';
  try {
    const [queryRes] = await db.query(querySql, [email]);
    if(queryRes.length === 0) return {isExist: false}
    // return queryRes[0].count === 1;
    return {isExist: true, queryRes: queryRes[0]};
  } catch (error) {
    console.log(error);
    return {isExist: false};
  }
}

// 更新用户信息
const updateUserinfo = async (req,res) => {
  // req 对象上的 auth 属性，是 Token 解析成功，express-jwt 中间件帮我们挂载上去的
  let {username, id} = req.auth
  const {username: NewUsername} = req.body;

  // if(!NewUsername) return res.err('用户名不能为空');

  try {
    // 用户名是否存在
    const queryName = 'SELECT COUNT(*) AS count FROM user WHERE username = ?'
    const [queryRes] = await db.query(queryName, NewUsername);
    if (queryRes[0].count > 0) return res.err('更新信息失败: 用户名已被注册');
    
    const querySql = 'SELECT * FROM user WHERE id = ? AND username = ?'
    // const changeNameSql = 'UPDATE user SET ? WHERE id = ? AND username = ?'
    const changeNameSql = 'UPDATE user SET username = ? WHERE id = ? AND username = ?'

    // const [changeNameRes] = await db.query(changeNameSql,[req.body, id, username])
    const [changeNameRes] = await db.query(changeNameSql,[NewUsername, id, username])
    if(changeNameRes.affectedRows !== 1) return res.err('更新信息失败');

    // 查询新的信息
    const [updateQueryRes] = await db.query(querySql,[id,NewUsername])

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
  const {oldPwd, newPwd} = req.body;

  // if(!oldPwd) return res.err('请输入旧密码');
  // if(!newPwd) return res.err('请输入新密码');

  const {username, id} = req.auth

  try {
    const querySql = 'SELECT * FROM user WHERE id = ? AND username = ?'
    const [queryRes] = await db.query(querySql,[id,username])

    if (queryRes.length !== 1) return res.err('修改密码失败');

    // 判断提交的旧密码是否正确
    // 可使用 bcrypt.compareSync(提交的密码，数据库中的密码) 方法验证密码是否正确
    // compareSync() 函数的返回值为布尔值，true 表示密码正确，false 表示密码错误
    const compareResult = bcrypt.compareSync(oldPwd, queryRes[0].password)
    if (!compareResult) return res.err('账号或密码错误')

    // 更新数据库密码
    const updatePwdSql = `UPDATE user SET password = ? WHERE id = ? AND username = ?`
    const bcrype_password = bcrypt.hashSync(newPwd, 10)

    const [updatePwdRes] = await db.query(updatePwdSql,[bcrype_password,id,username])
    if(updatePwdRes.affectedRows !== 1) return res.err('修改密码失败');

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
  const {username, id} = req.auth
  
  try {
    const deleteSql = 'DELETE FROM user WHERE id = ? AND username = ?';
    const [deleteRes] = await db.query(deleteSql, [id,username]);
    if(deleteRes.affectedRows !== 1) return res.err('注销账号失败');

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
const markUserAsDeleted  = async (req,res) => {
  const {username, id } = req.auth;
  const currentTime = Date.now();

  try {
    const updateSql = 'UPDATE user SET status = "0", logout_time = ? WHERE id = ? AND username = ?'
    const [updateRes] = await db.query(updateSql, [currentTime,id,username]);
    if(updateRes.affectedRows !== 1) return res.err('注销账号失败');

    res.send({
      status: 200,
      message: '注销账号成功'
    })

  } catch (error) {
    res.err('注销账号失败')
    console.log(error);
  }
}

// 更换邮箱验证码(密码验证)
const sendupdateEmailCode = async (req,res) => {
  // 获取信息
  const {email} = req.auth;
  const {newEmail, password} = req.body;

  // 查询邮箱是否存在,并拿到信息
  const checkEmailRes = await checkEmail(email);
  if(!checkEmailRes.isExist) return res.err('用户不存在');

  // 验证密码
  const compareResult = bcrypt.compareSync(password, checkEmailRes.queryRes.password)
  if (!compareResult) return res.err('密码错误')

  // 新邮箱是否已被注册
  const checkNewEmailRes = await checkEmail(newEmail)
  if(checkNewEmailRes.isExist) return res.err('邮箱已被注册');

  // 生成验证码
  const code = generateCode();

  // 设置验证码有效期为5分钟
  const pwdexpiryTime = Date.now() + 5 * 60 * 1000;
  emailChangeCodeExpiryMap[newEmail] = pwdexpiryTime;

  // 邮件内容
  const emailContent = {
    from: `Existing图床 ${user}`, // 发送者邮箱
    to: newEmail, // 接收者邮箱
    subject: 'Existing图床更换邮箱验证码提醒',
    html: `
      <div>
        <h1>正在进行更换邮箱</h1>
        <p>您的验证码是：<span style="color: blue; font-size: 20px;">${code}</span></p>
        <p>请注意：请勿向任何人透露此验证码，包括本网站的工作人员。本邮件是您在 Existing图床 进行更换邮箱的验证码，请勿回复此邮件。</p>
        <p>如果您未请求更换邮箱，请忽略此邮件。</p>
        <p>验证码将在5分钟内有效，过期后将无法使用。</p>
        <p>谢谢！</p>
      </div>
    `
  };

  // 发送邮件
  transport.sendMail(emailContent, (error, info) => {
    if (error) {
      console.log(error)
      res.err('邮件发送失败', 500)
    } else {
      console.log(`验证码已发送至${newEmail}`)
      emailChangeCodeMap[newEmail] = code // 存储验证码，以邮箱为键
      console.log(1, emailChangeCodeMap[newEmail]) // 添加此行，验证验证码是否正确存储
      res.send({
        status: 200,
        message: '验证码已发送'
      })
    }
  })
}

// 验证验证码,更换邮箱
const updateEmail = async (req, res) => {
  const { email, code } = req.body;
  const {email: oldEmail} = req.auth;
  const savedCode = emailChangeCodeMap[email];

  // 检查验证码是否过期
  const currentTime = Date.now();
  if (currentTime > emailChangeCodeExpiryMap[email]) {
    console.log(`${email}的验证码已过期`);
    return res.err('验证码验证失败', 401);
  };

  if (code && savedCode && code.toString() === savedCode) {
    console.log(`${email}的验证码验证通过`);
    delete emailChangeCodeMap[email]; // 验证通过后删除验证码
  } else {
    console.log(`${email}的验证码验证失败`);
    return res.err('验证码验证失败', 401);
  }

  try {
    const updateSql = `UPDATE user SET email = ? WHERE email = ?`;
    const [updateRes] = await db.query(updateSql, [email, oldEmail]);

    if (updateRes.affectedRows !== 1) return res.err('邮箱更换失败', 500);

    res.send({ status: 200, message: '邮箱更换成功' });
  } catch (error) {
    console.log(error);
    return res.err('邮箱更换失败', 500);
  }
}

// 个人上传日志
const userUploadLog = async (req, res) => {
  // batchSize:每次查询的数量,默认30, offset查询起始位置,默认0开始
  const {batchSize, offset} = req.query;
  const { username } = req.auth;
  // 最近上传的在最上面
  const querySql = 'SELECT * FROM images WHERE uploader = ? ORDER BY id DESC LIMIT ?, ?';

  try {
    const [queryRes] = await db.query(querySql, [username, offset, batchSize]);

    // 下一次查询的起始位置为本此查询到的数量+上次的偏移量
    const nextOffset = offset + queryRes.length;

    res.send({ status: 200, count: queryRes.length, nextOffset, data: {uploadLog: queryRes} })
  } catch (error) {
    console.log(error);
    return res.err('获取失败', 500);
  }
}

export default {
  updateUserinfo,
  updatePassword,
  deleteUser,
  markUserAsDeleted,
  sendupdateEmailCode,
  updateEmail,
  userUploadLog
}