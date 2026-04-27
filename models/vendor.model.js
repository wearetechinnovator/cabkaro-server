const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    vendor_name: String,
    vendor_phone: String,
    vendor_img: String,
    vendor_type: {
        type: String,
        enum: ['1', '2'] //1=`Individual` |  2=`Agency`
    },
    socket_id: String,
    profile_completed: {
        type: Boolean,
        default: false
    },
    profile_step: {
        type: String,
        default: "0"
    }
}, { timestamps: true })

// vendorSchema.index({ current_location: '2dsphere' })
const vendorModel = mongoose.model('vendor', vendorSchema);

module.exports = vendorModel;