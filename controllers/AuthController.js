const jwt = require('jsonwebtoken')
const userModel = require('../models/User')
require('dotenv').config({ path: './config.env' })
const {email} = require('../services/email')


const JWT_SECRET = process.env.JWT_SECRET + ''
const MODE = process.env.MODE + ''

// Using this Authorization_Middleware in routes...
// router.get('/dashboard', Authorization_Middleware(['admin']), dashboard)

const Authorization_Middleware = async (req, res, next) => {
    const token = req.cookies.jwt || req.headers.Authorization || ''
    
    if (token === '') {               //Checking Token availability...
        return res.status(401).json({ 'success': false, 'Auth': false, 'details': "Cookies/Token Not Found!" })
    }
    // console.log(req.cookies)
    try {
        const decode = await jwt.verify(token, JWT_SECRET)       //Verifying JWT Token...
        if (decode) {
            const user = await userModel.findById(decode.user_id).select('-password').lean()      //Checking if user existed in DB...
            if (!user) {
                return res.status(408).json({ 'success': false, 'Auth': false, 'details': "User Not Found in our DB!" })
            }
            
            if (new Date(decode.validFor).getTime() !== new Date(user.passwordModifiedAt).getTime()) {
                return res.status(423).json({ 'success': false, 'Auth': false, 'details': "Details Not Matched! Please Login again." });
            }
            
            req.user = {                //Assigning user's details to req-obj for future use...
                'userId': user._id,
                // 'username': user.username,
                // 'email': user.email,
                // 'subscription': user.subscription || false
            };
            console.log("Authorized")       //Passing to next middleware (endPoint).
            next()
        }
        else {
            return res.status(403).json({ 'success': false, 'Auth': false, 'details': "Invalid Token!" });
        }
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({ 'success': false, 'Auth': false, 'details': "Error while Verifying Token!" });
    }
}

const forgotPassword = async(req, res, next)=>{
    // const home_url = req.query.home_url||'http://localhost:3000/'
    const { email } = req.body

    if(!email){
        return res.status(400).json({'success': false, 'details':'Invalid inputs!'})
    }

    const otp = (Math.floor(1000 + Math.random() * 9000))+''
    const payload = {
        email,
        otp
    }
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn:'5m'})
    try{
        const r = await userModel.findOneAndUpdate({email}, {otp})
    }
    catch(err){
        // console.log(err)
        return res.status(500).json({'success': false, 'details':'Email Not Matched with our Data!'})
    }

    const body = {
        email,
        subject:'Forgot Password request!',
        htmlText:`<html><body>
                <h1>Hello User,,</h1>
                <br>
                <h5>Your Password Reset request has been approved!</h5>
                <br>
                <h4>click below link & Follow the instructions to reset your forgotten password.</h4>
                <br>
                <a href="http://localhost:8080/api/auth/reset-password?q="+${token}>Click Here</a>
                <br>
                <p>OR</p>
                <div>http://localhost:8080/api/auth/reset-password?q=${token}</div>
                <br><br>
                <p>~Thanks  from feedback team.</p>
                <p>~Verseify</p>
                </body></html>`
    }
    try {               //Sending Email with Token...
        const r = await email(body)
        if(r.success){
            return res.status(201).json({'success': true, 'details':'Email sent with Verification Code.'})
        }
    }
    catch (err) {
        // console.log(err)
        return res.status(500).json({'success': false, 'details':'Unable to send email!'})
    }
    return res.status(500).json({'success': false, 'details':'Unable to send email!'})
}

const resetPassword = async (req, res)=>{
    const token1 = req.query.q||''
    const body = req.body

    if(token1===''){            //Check Old-Password & update a New one...
        if(body.user_id==='' || body.oldPassword==='' || body.newPassword===''){
            return res.status(400).json({'success': false, 'details':'Invalid inputs!'})
        }
        try {
            const r = await userModel.findById(body.user_id)
            if(!r || !r.comparePassword(body.oldPassword)){
                return res.status(403).json({'success': false, 'details':'Password Not matched!'})
            }

            await userModel.findByIdAndUpdate(body.user_id, {password: body.newPassword})      //final...
            return  res.status(201).json({'success': true, 'details':'Password Changed.'})
        }
        catch(err) {
            console.log(err)
            return res.status(500).json({'success': false, 'details':'Unable to modify Password!'})
        }
    }
    else{                       //Resetting a Forgotten Password...
        if(body.newPassword===''){
            return res.status(400).json({'success': false, 'details':'Invalid inputs!'})
        }
        try {
            const token = jwt.verify(token1, JWT_SECRET)
            // console.log(token)
            if(!token){
                return res.status(403).json({'success': false, 'details':'Invalid Token!'})
            }
            const r = await userModel.findOne({email: token.email}, {otp: 1}).lean()
            
            if(r.otp===token.otp){                     //final...
                await userModel.findByIdAndUpdate(r._id, {password: body.newPassword, otp: null})
                return  res.status(201).json({'success': true, 'details':'Password Changed.'})
            }
            return res.status(403).json({'success': false, 'details':'Invalid OTP!'})
        }
        catch(err) {
            console.log(err)
            return res.status(500).json({'success': false, 'details':'Unable to modify Password!'})
        }
    }
}

const signUp = async (req, res) => {
    const body = req.body

    if (body.username === '' || body.email === '' || body.password === '') {
        return res.status(400).json({ 'success': false, 'details': 'Invalid Details!' })
    }

    try {                               //Checking if user already exists in db...
        const response = await userModel.findOne({ email: body.email }).lean()
        if (response) {
            return res.status(400).json({ 'success': false, 'details': 'User already exists in our DB! Please do SignIn.' })
        }
    }
    catch (error) {
        // console.log(error)
        return res.status(500).json({ 'success': false, 'details': 'Failed to Retrieve data!' })
    }

    try {                               //Creating New User in DB...
        const response = await userModel.create(body)
        if (!response) {
            return res.status(501).json({ 'success': false, 'details': 'Failed to Create New User! Please try again.' })
        }
        //Token Generation...
        try {
            let token_body = {
                user_id: response._id,
                validFor: response.passwordModifiedAt,
            }
            // const token = await jwt.sign(token_body, JWT_SECRET, { expiresIn: '7d' })
            const token = await new Promise((resolve, reject) => {
                jwt.sign(token_body, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                    if (err) reject(err)
                    resolve(token)
                })
            })
            if (!token) {
                return res.status(501).json({ 'success': false, 'details': 'Token Creation Failed!' })
            }
            try{
                res.cookie('jwt', token, { path: '/api', httpOnly: true, secure: (MODE === 'production') || true, sameSite: 'None', expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
                return res.status(201).json({ 'success': true, 'details': 'New User created successfully!' })
            }
            catch(err){
                return res.status(201).json({ 'success': true, 'details': 'New User created successfully!', token })
            }
        }
        catch (error) {
            // console.log(error)
            return res.status(500).json({ 'success': false, 'details': 'Token Creation Failed!' })
        }
    }
    catch (error) {
        // console.log(error)
        return res.status(500).json({ 'success': false, 'details': 'Failed to Create New User! Please try again.' })
    }
}


const signIn = async (req, res) => {
    const body = req.body
    if (body.email === '' || body.password === '') {
        return res.status(400).json({ 'success': false, 'details': 'Invalid Details!' })
    }

    try {                               //Checking if user exists in db...
        const response = await userModel.findOne({ email: body.email })
        // console.log(response)
        if (!response) {
            return res.status(400).json({ 'success': false, 'details': 'User Not Found in our DB! Please do SignUp first.' })
        }

        if (!(response.comparePassword(body.password))) {            //Comparing Passwords...
            return res.status(401).json({ 'success': false, 'details': 'Password Not Matched!' })
        }
                                        //Token Generation...
        try {
            let token_body = {
                user_id: response._id,
                validFor: response.passwordModifiedAt,
            }
            const token = await new Promise((resolve, reject) => {
                jwt.sign(token_body, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                    if (err) reject(err);
                    resolve(token);
                })
            })
            if (!token) {
                return res.status(501).json({ 'success': false, 'details': 'Token Creation Failed!' })
            }
            try{
                res.cookie('jwt', token, { path: '/api', httpOnly: true, secure: (MODE === 'production') || true, sameSite: 'None', expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
                return res.status(201).json({ 'success': true, 'details': 'User verified successfully!' })
            }
            catch(err){
                return res.status(201).json({ 'success': true, 'details': 'User verified successfully!', token })
            }
        }
        catch (error) {
            // console.log(error)
            return res.status(500).json({ 'success': false, 'details': 'Token Creation Failed!' })
        }
    }
    catch (error) {
        // console.log(error)
        return res.status(500).json({ 'success': false, 'details': 'Failed to Retrieve data!' })
    }
}

const signOut = async (req, res) => {
    try {                            //Clearing JWT token (cookie)...
        res.clearCookie('jwt', { path: '/api', secure: (MODE === 'production') || true, sameSite: 'None', httpOnly: true })
        return res.status(200).json({ 'success': true, 'details': "Cookie Cleared, Login again." })
    }
    catch (err) {
        return res.status(500).json({ 'success': false, 'details': "No Cookie Found, Login again.", 'error': err })
    }
}


module.exports = { signUp, signIn, signOut, Authorization_Middleware, forgotPassword, resetPassword }
