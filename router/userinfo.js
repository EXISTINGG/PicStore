import express from 'express';
import expressJoi from '@escook/express-joi' // 验证数据的中间件
import {updateinfo_schema, updatepwd_schema} from '../schema/user.js' // 验证规则
// import {checkStatus} from './user.js' // 检查用户状态中间件
import userInfoHandle from '../router_handler/userinfo.js'

const router = new express.Router()

router.post('/updateinfo',expressJoi(updateinfo_schema), userInfoHandle.updateUserinfo)
router.post('/updatepwd',expressJoi(updatepwd_schema), userInfoHandle.updatePassword)
router.post('/deleteuser',expressJoi(updateinfo_schema), userInfoHandle.updateUserStatus)


export default router