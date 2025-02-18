const userModel = require('../models/User')
const customError = require('../utils/customError')


const getAll = async (req, res)=>{
    const r = await userModel.find({}).select('-password').lean()
    if(!r){
        throw new customError(500, { 'success': false, 'details': 'Unable to fetch Users!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Fetched all Users!', 'users':r })
}

const get = async (req, res)=>{
    const id = req.params.id

    const r = await userModel.findById(id).select('-password').lean()
    if(!r){
        throw new customError(500, { 'success': false, 'details': 'Unable to fetch User!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Fetched User!', 'user':r })
}

const update = async (req, res)=>{
    const id = req.params.id
    const body = req.body

    const r = await userModel.findByIdAndUpdate(id, body, {new:true}).lean()
    if(!r){
        throw new customError(500, { 'success': false, 'details': 'Unable to update User!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Updated User!', 'user':r })
}

const remove = async (req, res)=>{
    const id = req.params.id

    const r = await userModel.findByIdAndDelete(id)
    if(!r){
        throw new customError(500, { 'success': false, 'details': 'Unable to delete User!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Deleted User!', 'user':r })
}


module.exports = {getAll, get, update, remove}
