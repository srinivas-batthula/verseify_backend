const express = require("express");
const router = express.Router();
const { createOrder, paymentVerify } = require("../controllers/paymentController");


router.post("/order", createOrder)
router.post('/verify', paymentVerify)


module.exports = router