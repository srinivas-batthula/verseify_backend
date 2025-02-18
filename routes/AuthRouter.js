const router = require("express").Router();
require("dotenv").config({ path: "../config.env" });
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const AuthController = require("../controllers/AuthController");
const userModel = require('../models/User')


router.post("/signUp", AuthController.signUp);
router.post("/signIn", AuthController.signIn);
router.get("/signOut", AuthController.signOut);

router.get("/googleAuth", (req, res) => {
    return res.redirect("/api/auth/google")
});

router.post("/forgot-password", AuthController.forgotPassword);
router.use("/reset-password", AuthController.resetPassword);

//For OAuth2.0, add this line 'app.use(passport.initialize())' in 'app.js' to Initialize OAuth...
//To use OAuth, Redirect directly from Frontend as "window.href = '__backend-OAuth-url__'", As backend handles whole OAuth...

let user = {};
// Use Google OAuth strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_1 + "",
            clientSecret: process.env.GOOGLE_CLIENT_2 + "",
            callbackURL:
                process.env.MODE === "production"
                    ? "__hosted_url__/api/auth/google/callback"
                    : "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const data = {
                    //accessed from Google...
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    password: "google",
                };
                // Check if the user exists in the database...
                let response;
                response = await userModel.findOne({ email: data.email }).lean();
                if (!response) {
                    //User Not Found,, Create New User...
                    response = await userModel.create(data);
                }
                user = response;

                // Return the user data to the passport callback
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);

// Google Authentication Routes (Starter Path)
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["email", "profile"],
    })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/api/auth/google/failure",
    }),
    async (req, res) => {
        console.log("success");
        try {
            //Token Generation...
            let token_body = {
                user_id: user._id,
                validFor: user.passwordModifiedAt,
            };
            const token = await jwt.sign(token_body, JWT_SECRET, { expiresIn: "7d" });
            if (!token) {
                return res
                    .status(501)
                    .json({ status: "failed", details: "Token Creation Failed!" });
            }
            res.cookie("jwt", token, {
                path: "/api",
                httpOnly: true,
                secure: MODE === "production" || true,
                sameSite: "None",
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
            return res.status(201).json({'status':'success', 'details':'User Logged-In successfully!'})
            // return res.status(201).redirect("home_url" + ""); //Redirecting User to Home-Page...
        } catch (error) {
            console.log(error);
            return res
                .status(500)
                .json({ status: "failed", details: "Token Creation Failed!" });
        }
    }
);

router.get("/google/failure", (req, res) => {
    console.log("failed");
    // res.status(403).redirect("home_url" + "/login"); //Return to Login-Page...
    res.json({'status':'Un-Authorized', 'details':'Please SignIn to continue...', user})
});


module.exports = router;
