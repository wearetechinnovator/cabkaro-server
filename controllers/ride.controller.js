const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const redis = require("../db/redis.js");
const rideModel = require("../models/ride.model.js");
const { socketIO } = require("../sockets/index.js");
const rideNegotiationModel = require("../models/rideNego.model.js");



class RideController {
    static createRide = async (req, res) => {
        const {
            pickup_location, drop_location, price, pickup_date, pickup_time
        } = req.body;
        const userData = req.user;

        if (!pickup_location || !drop_location || !price || !pickup_date || !pickup_time) {
            throw new ApiError(400, "All fields are required");
        }

        if (
            pickup_location.lat == null ||
            pickup_location.lng == null ||
            drop_location.lat == null ||
            drop_location.lng == null
        ) {
            throw new ApiError(400, "Invalid pickup or drop location");
        }


        // Insert into DB
        const newRide = await rideModel.create({
            user: userData.id,
            pickup_location: {
                type: "Point",
                coordinates: [pickup_location.lng, pickup_location.lat]
            },
            drop_location: {
                type: "Point",
                coordinates: [drop_location.lng, drop_location.lat]
            },
            price,
            pickup_date,
            pickup_time
        })

        if (!newRide) {
            throw new ApiError(500, "Failed to create ride");
        }

        // insert in Redis;
        await redis.geoadd(
            "rides",
            Number(pickup_location.lng),
            Number(pickup_location.lat),
            newRide._id.toString()
        );


        return res.status(201).json({ data: newRide });
    }


    static editRide = async (req, res) => {
        const {
            pickup_location, drop_location, price, pickup_date, pickup_time,
            rideId
        } = req.body;
        const userData = req.user;

        if (!pickup_location || !drop_location || !price || !pickup_date || !pickup_time || !rideId) {
            throw new ApiError(400, "All fields are required");
        }

        if (
            pickup_location.lat == null ||
            pickup_location.lng == null ||
            drop_location.lat == null ||
            drop_location.lng == null
        ) {
            throw new ApiError(400, "Invalid pickup or drop location");
        }

        // Ride Exis or not;
        const ride = await rideModel.findOne({ _id: rideId, user: userData.id });
        if (!ride) {
            throw new ApiError(404, "Ride not found or unauthorized");
        }

        // Check Ride Edit or not
        const isRideEdit = await rideModel.findOne({ _id: rideId, status: "searching" });
        if (!isRideEdit) {
            throw new ApiError(404, "This ride can't edit now");
        }


        // Edit in DB
        const editR = await rideModel.updateOne({ _id: rideId }, {
            $set: {
                pickup_location: {
                    type: "Point",
                    coordinates: [pickup_location.lng, pickup_location.lat]
                },
                drop_location: {
                    type: "Point",
                    coordinates: [drop_location.lng, drop_location.lat]
                },
                price,
                pickup_date,
                pickup_time
            }
        })

        if (editR.modifiedCount === 0) {
            throw new ApiError(500, "Ride not update");
        }


        await redis.geoadd(
            "rides",
            Number(pickup_location.lng),
            Number(pickup_location.lat),
            rideId.toString()
        );

        return res.status(200).json({
            msg: "Ride updated successfully"
        });

    }


    static getNearestRide = async (req, res) => {
        const { lat, lng, page = 1, limit = 10 } = req.query;
        const driverData = req.user;


        if (!lat || !lng) {
            throw new ApiError(400, "Latitude and Longitude are required");
        }

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        const driver = await driverModel.findById(driverData.id);
        if (!driver) {
            throw new ApiError(404, "Driver not found");
        }
        const serviceRadius = driver.service_radius_km;


        const result = await rideModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    distanceField: "distance",
                    maxDistance: serviceRadius * 1000, // km → meters
                    query: { status: "searching" },
                    spherical: true
                }
            },
            {
                $facet: {
                    data: [
                        { $sort: { _id: -1 } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user",
                                foreignField: "_id",
                                as: "user"
                            }
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                "user.password": 0
                            }
                        },
                        { $skip: skip },
                        { $limit: pageSize }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ]);

        const rides = result[0].data;
        const total = result[0].totalCount[0]?.total || 0;

        return res.status(200).json({
            msg: "Nearby rides found",
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            rides
        });
    };


    static createRideNego = async (req, res) => {
        const { rideId, proposed_price, proposed_pickup_time } = req.body;
        const driverData = req.user;
        console.log(rideId, proposed_price, proposed_pickup_time,);

        if (!rideId || !proposed_price || !proposed_pickup_time) {
            throw new ApiError(400, "All fields are required");
        }

        const ride = await rideModel.findById(rideId);
        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        if (ride.status !== "searching") {
            throw new ApiError(400, "Ride is no longer available for negotiation");
        }


        const negotiation = await rideNegotiationModel.findOneAndUpdate(
            {
                ride: rideId,
                driver: driverData.id
            },
            {
                proposed_price,
                proposed_pickup_time,
                status: "pending",
                expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 min expiry
            },
            {
                new: true,
                upsert: true
            }
        );

        return res.status(200).json({
            msg: "Negotiation submitted successfully",
            data: negotiation
        });
    };


    static getNegoRide = async (req, res) => {
        const { rideId } = req.params;
        const userId = req.user?._id;

        if (!rideId) {
            throw new ApiError(400, "rideId is required");
        }


        const ride = await rideModel.findById(rideId);
        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        if (ride.user.toString() !== userId.toString()) {
            throw new ApiError(403, "Unauthorized access");
        }


        const negotiations = await rideNegotiationModel
            .find({
                ride: rideId,
                status: "pending",
                expires_at: { $gt: new Date() } // only valid offers
            })
            .populate({
                path: "driver",
                select: "name rating vehicle_number vehicle_type"
            })
            .sort({ proposed_price: 1, createdAt: 1 });

        const bestOffer = negotiations.length > 0 ? negotiations[0] : null;

        return res.status(200).json({
            total: negotiations.length,
            best_offer: bestOffer,
            data: negotiations
        });


    };


    static accepetRideByUser = async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { negotiationId } = req.body;
            const userId = req.user;

            if (!negotiationId) {
                throw new Error("negotiationId is required");
            }

            // 1️⃣ Get negotiation
            const negotiation = await rideNegotiationModel.findById(negotiationId).session(session);
            if (!negotiation) {
                throw new ApiError(404, "Negotiation not found");
            }

            // 2️⃣ Get ride
            const ride = await rideModel.findById(negotiation.ride).session(session);
            if (!ride) {
                throw new ApiError(404, "Ride not found");
            }

            // 3️⃣ Security check (only ride owner)
            if (ride.user.toString() !== userId.id) {
                throw new ApiError(403, "Unauthorized");
            }

            // 4️⃣ Prevent double accept (VERY IMPORTANT ⚠️)
            if (ride.status !== "searching" && ride.status !== "negotiating") {
                throw new ApiError(400, "Ride already accepted or closed");
            }

            // 5️⃣ Check negotiation still valid
            if (negotiation.status !== "pending" || negotiation.expires_at < new Date()) {
                throw new ApiError(400, "Offer expired or already used");
            }

            // 6️⃣ Accept selected negotiation
            negotiation.status = "accepted";
            await negotiation.save({ session });

            //  Update ride
            ride.driver = negotiation.driver;
            ride.price = negotiation.proposed_price;
            ride.pickup_time = negotiation.proposed_pickup_time;
            ride.status = "accepted";
            // ride.selected_offer = negotiation._id;

            await ride.save({ session });

            // Reject all other negotiations
            await rideNegotiationModel.updateMany(
                {
                    ride: ride._id,
                    _id: { $ne: negotiation._id }
                },
                {
                    status: "rejected"
                },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                msg: "Ride accepted successfully",
                data: ride
            });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({
                success: false,
                err: error.message
            });
        }
    };


    static getAcceptedRidesForDriver = async (req, res) => {
        const driverId = req.user?._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const rides = await rideModel
            .find({
                driver: driverId,
                status: { $in: ["accepted", "completed"] } // adjust if needed
            })
            .populate({
                path: "user",
                select: "name phone"
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await rideModel.countDocuments({
            driver: driverId,
            status: { $in: ["accepted", "completed"] }
        });

        return res.status(200).json({
            success: true,
            message: "Driver rides fetched successfully",
            page,
            total,
            totalPages: Math.ceil(total / limit),
            data: rides
        });


    };

    
}


module.exports = RideController;