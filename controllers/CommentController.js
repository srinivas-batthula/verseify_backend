const CommentModal = require('../models/Comment')
const customError = require('../utils/customError')



const getAll = async (req, res) => {
    const { blogId } = req.params

    try {
        const comments = await CommentModal.find({blogId}).lean()
        if(!comments) {
            throw new customError(503, { 'success': false, 'details': 'Unable to Fetch all Comments!' })
        }

        // Function to recursively nest comments
        const buildNestedComments = (parentId = null) => {
            return comments
                .filter(comment => String(comment.parentId) === String(parentId))
                .map(comment => ({
                    ...comment,
                    replies: buildNestedComments(comment._id),
                }))
        }

        const nestedComments = buildNestedComments()

        return res.status(200).json({ 'success': true, 'details': 'Successfully Fetched all Comments!', 'comments': nestedComments })
    }
    catch (err) {
        throw new customError(500, { 'success': false, 'details': 'Unable to Fetch all Comments!', error: err })
    }
}


const create = async (req, res) => {
    const { blogId } = req.params
    const body = req.body                   //'user-id' is mandatory in body...

    try {
        body.blogId = blogId
        const r = await CommentModal.create(body)
        if (!r) {
            throw new customError(503, { 'success': false, 'details': 'Unable to Create Comment!' })
        }
        return res.status(200).json({ 'success': true, 'details': 'Successfully Created Comment!', 'comment': r })
    }
    catch (err) {
        throw new customError(500, { 'success': false, 'details': 'Unable to Create Comment!', error: err })
    }
}


const update = async (req, res) => {
    const { id } = req.params
    const q = req.query.q || 'like'                   //For adding LIKE to a Comment...

    if (q === 'like') {
        try {
            const r = await CommentModal.findById(id)
            r.likesCount += 1
            await r.save()

            return res.status(200).json({ 'success': true, 'details': 'Successfully Liked a Comment!', 'comment': r })
        }
        catch (err) {
            throw new customError(500, { 'success': false, 'details': 'Unable to Like a Comment!', error: err })
        }
    }
}





module.exports = { getAll, create, update }