const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
    vendor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vendor',
        required: true
    },
    driver_name: String,
    driver_phone: Number,
    driver_img: String
}, { timestamps: true });

const driverModel = mongoose.model("driver", driverSchema);
module.exports = driverModel;