const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ride"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "driver"
    },
    rating: Number,
    comment: String
},{timestamps: true});

const reviewModel = mongoose.model('review', reviewSchema);

module.exports = reviewModel;