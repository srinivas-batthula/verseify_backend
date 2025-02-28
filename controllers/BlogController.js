const cloudinary = require("../cloudinaryConfig")
const blogModal = require('../models/Blog')
const mongoose = require("mongoose")
const customError = require('../utils/customError')




const getAll = async (req, res) => {

    // Pagination parameters (defaults: page '1', limit '6')
    const page = parseInt(req.query.page) || 1
    const limit = 6
    const skip = (page - 1) * limit

    try {
        const blogs = await blogModal.aggregate([
            // 1️⃣ Project only the required 'BLOG' fields
            {
                $project: {
                    author: 1,
                    title: 1,
                    content: 1,
                    tags: 1,
                    likes: 1,
                    media: 1,
                    createdAt: 1,
                }
            },

            // 2️⃣ Lookup 'AUTHOR' details from 'verseify_users'
            {
                $lookup: {
                    from: 'verseify_users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },

            // 3️⃣ Unwind to flatten the author array
            { $unwind: '$authorInfo' },

            // 4️⃣ Final projection with author details...
            {
                $project: {
                    author: 1,
                    title: 1,
                    content: 1,
                    tags: 1,
                    likes: 1,
                    media: 1,
                    createdAt: 1,
                    authorName: '$authorInfo.username',
                    authorBio: '$authorInfo.bio',
                    authorPic: '$authorInfo.profile_pic',
                }
            },

            // 5️⃣ Sort by newest first
            { $sort: { createdAt: -1 } },

            // 6️⃣ Pagination
            { $skip: skip },
            { $limit: limit }
        ])

        // 7️⃣ Total blogs count for pagination info
        const totalCount = await blogModal.countDocuments()

        res.status(200).json({
            success: true,
            totalBlogs: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            blogs
        })
    }
    catch (error) {
        // console.error('Error fetching blogs:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to Fetch Blogs!',
            error: error.message
        })
    }
}


const regexImage = /\.(jpg|jpeg|png|webp|svg|gif)$/i
const regexVideo = /\.(mp4|webm|avi|mov)$/i
const regexAudio = /\.(mp3|wav|aac|ogg)$/i
const regexPdf = /\.pdf$/i

const create = async (req, res) => {
    const userId = req.params.userId
    const body = req.body
    const check = req.query.q || false           //For 'File-Upload' check = true and otherwise it is false...
    let media = {
        secure_url: '',
        public_id: ''
    }

    if (check) {
        // Extract file extension
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase()

        // Set resource_type and format based on the file extension
        let resource_type1 = "auto"

        // Determine resource type and format
        if (regexImage.test(fileExtension)) {
            resource_type1 = "image";
        } else if (regexVideo.test(fileExtension)) {
            resource_type1 = "video";
        } else if (regexAudio.test(fileExtension)) {
            resource_type1 = "video";
        } else if (regexPdf.test(fileExtension)) {
            resource_type1 = "raw";  // Raw files like PDFs
        }

        try {                                           //  Files are stored in cloudinary...
            const result = cloudinary.uploader.upload_stream(
                {
                    resource_type: resource_type1,
                    format: fileExtension + '' || "auto",
                    context: { id: userId, type: 'blog' }       // To identify file belongs to which doc in db...
                },

                async (error, result) => {
                    if (error) {
                        return res.status(503).json({ success: false, error: error.message, message: "Failed to upload file!" })
                    }
                    // console.log(result)
                    try {
                        media.secure_url = result.secure_url
                        media.public_id = result.public_id

                        // return res.json({ success: true,  message: 'File Uploaded Successfully!', filePath: t.secure_url, public_id: t.public_id});
                    }
                    catch (err) {
                        return res.status(500).json({ success: false, error: error.message, message: "File Upload Failed!" })
                    }
                }
            ).end(req.file.buffer)
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err, message: "Something went Wrong!" })
        }
    }

    body.media = media
    body.author = userId
    const r = await blogModal.create(body)
    if(!r) {
        throw new customError(500, { 'success': false, 'details': 'Unable to Create Blog!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Created Blog!', 'blog': r })
}


const get = async (req, res) => {
    const id = req.params.id

    try {
        // Check if the ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Blog ID!' })
        }

        const blog = await blogModal.aggregate([
            // 1️⃣ Match the Blog by its '_id'
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
            },

            // 2️⃣ Project only the required blog fields
            {
                $project: {
                    author: 1,
                    title: 1,
                    content: 1,
                    tags: 1,
                    likes: 1,
                    media: 1,
                    createdAt: 1,
                }
            },

            // 3️⃣ Lookup Author details from 'verseify_users'
            {
                $lookup: {
                    from: 'verseify_users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },

            // 4️⃣ Unwind to flatten the author array
            { $unwind: '$authorInfo' },

            // 5️⃣ Final projection with blog & author details
            {
                $project: {
                    author: 1,
                    title: 1,
                    content: 1,
                    tags: 1,
                    likes: 1,
                    media: 1,
                    createdAt: 1,
                    authorName: '$authorInfo.username',
                    authorBio: '$authorInfo.bio',
                    authorPic: '$authorInfo.profile_pic.secure_url',
                    authorSocials: '$authorInfo.social_links',
                }
            }
        ])

        if (!blog.length) {
            return res.status(404).json({ success: false, message: 'Blog Not Found!' })
        }

        res.status(200).json({ success: true, blog: blog[0] })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to Fetch Blog!',
            error: error.message
        })
    }
}


const update = async (req, res) => {
    const id = req.params.id
    const body = req.body
    const {q} = req.query

    if(q==='like'){
        try{
            const r = await blogModal.findById(id)
            const bodyIdObject = new mongoose.Types.ObjectId(body.id) // Convert `body.id` to ObjectId
            if(!r.likes.includes(bodyIdObject)){
                r.likes.push(bodyIdObject)
                await r.save()
            }
            return res.status(200).json({'success': true, 'details': 'Successfully Liked Blog!', 'blog': r})
        }
        catch(err){
            throw new customError(500, { 'success': false, 'details': 'Unable to Like a Blog!' })
        }
    }

}


const remove = async (req, res) => {
    const id = req.params.id

    const r = await userModel.findByIdAndDelete(id)
    if (!r) {
        throw new customError(500, { 'success': false, 'details': 'Unable to delete Blog!' })
    }
    return res.status(200).json({ 'success': true, 'details': 'Successfully Deleted Blog!', 'blog': r })
}


const myBlogs = async (req, res) => {
    const { userId } = req.params

    try {
        const blogs = await blogModal.aggregate([
            // 1️⃣ Match blogs by userId (author)
            {
                $match: { author: new mongoose.Types.ObjectId(userId) }
            },

            // 2️⃣ Project the required fields
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: 1,
                    tags: 1,
                    likes: 1,
                    media: 1,
                    createdAt: 1
                }
            },

            // 3️⃣ Sort by newest first
            { $sort: { createdAt: -1 } }
        ])

        // Check if blogs exist
        if (!blogs.length) {
            return res.status(200).json({
                success: true,
                message: 'No blogs found!'
            })
        }

        // 4️⃣ Send the blogs
        res.status(200).json({
            success: true,
            totalBlogs: blogs.length,
            blogs
        })
    }
    catch (error) {
        console.error('Error fetching user blogs:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user blogs!',
            error: error.message
        })
    }
}





module.exports = { get, create, remove, getAll, myBlogs, update }