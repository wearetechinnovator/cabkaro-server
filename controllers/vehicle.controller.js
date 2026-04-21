const vendorModel = require("../models/vendor.model.js");
const vehicleModel = require("../models/vehicle.model.js");
const ApiError = require("../utils/ApiError.js");
const otpModel = require("../models/otp.model.js");



class VehicleController {
    // Add and Update Vehicle;
    static addVehicle = async (req, res) => {
        const { vehicleDetails } = req.body;
        const userData = req.user; // from auth middleware

        if (vehicleDetails.length < 1) {
            throw new ApiError(400, "At least one vehicle detail is required");
        }

        // Check if vendor exists
        const vendor = await vendorModel.findById(userData.id);
        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        // Check all fields available in each vehicle detail
        for (let vehicle of vehicleDetails) {
            const { vehicle_number, vechicle_img, is_ac, facilities, is_sos } = vehicle;

            if ([vehicle_number, vechicle_img, is_ac, facilities, is_sos].some(field => !field || field === "")) {
                throw new ApiError(400, "All fields are required for each vehicle");
            }

            break;
        }

        // Add vehicles to DB
        const vehiclesToAdd = vehicleDetails.map(vehicle => {
            if (vehicle._id) {
                // Existing vehicle — update by _id
                return {
                    updateOne: {
                        filter: { _id: vehicle._id, vendor_id },
                        update: {
                            $set: {
                                vehicle_number: vehicle.vehicle_number,
                                vechicle_img: vehicle.vechicle_img,
                                is_ac: vehicle.is_ac,
                                facilities: vehicle.facilities,
                                is_sos: vehicle.is_sos
                            }
                        }
                    }
                };
            } else {
                // New vehicle — insert it
                return {
                    insertOne: {
                        document: {
                            vendor_id,
                            vehicle_number: vehicle.vehicle_number,
                            vechicle_img: vehicle.vechicle_img,
                            is_ac: vehicle.is_ac,
                            facilities: vehicle.facilities,
                            isSOS: vehicle.isSOS
                        }
                    }
                };
            }
        });

        const result = await vehicleModel.bulkWrite(vehiclesToAdd);
        if (!result || (result.insertedCount === 0 && result.modifiedCount === 0 && result.upsertedCount === 0)) {
            throw new ApiError(500, "Failed to process vehicles");
        }

        return res.status(200).json({ msg: "Vehicles processed successfully" });

    }

    // get vehicle by ID
    static getVehicleById = async (req, res) => {
        const { id } = req.params;
        if (!id) {
            throw new ApiError(400, "Vehicle ID is required");
        }

        const vehicle = await vehicleModel.findById(id);
        if (!vehicle) {
            throw new ApiError(404, "Vehicle not found");
        }

        return res.status(200).json({ data: vehicle });
    }

    // Get all vehicles of a vendor
    static getVendorVehicles = async (req, res) => {
        const userData = req.user; // from auth middleware

        // Check if vendor exists
        const vendor = await vendorModel.findById(userData.id);
        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        const vehicles = await vehicleModel.find({ vendor_id: userData.id });
        return res.status(200).json({ data: vehicles });

    }

    // Set vehicle availability and service area
    static addVehicleAvailability = async (req, res) => {
        const {
            is_available, vehicle_id, service_location, service_area
        } = req.body;


        if ([is_available, vehicle_id, service_location, service_area].some(field => field === undefined || field === null)) {
            throw new ApiError(400, "All fields are required");
        }


        if (is_available) {
            // Make vehicle available with location and service area
            const updatedVehicle = await vehicleModel.findByIdAndUpdate(vehicle_id, {
                is_available: true,
                service_location: {
                    type: "Point",
                    coordinates: [service_location.longitude, service_location.latitude]
                },
                service_radius_km: service_area
            }, { new: true });

            if (!updatedVehicle) {
                throw new ApiError(500, "Failed to update vehicle availability");
            }

            return res.status(200).json({ msg: "Vehicle is now available for rides", data: updatedVehicle });
        } else {
            // Make vehicle unavailable
            const updatedVehicle = await vehicleModel.findByIdAndUpdate(vehicle_id, {
                is_available: false
            }, { new: true });

            if (!updatedVehicle) {
                throw new ApiError(500, "Failed to update vehicle availability");
            }

            return res.status(200).json({ msg: "Vehicle is now unavailable for rides", data: updatedVehicle });
        }


    }

    // Get available vehicles for a given location
    static getAvailableVehicleForCurrentLocation = async (req, res) => {
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            throw new ApiError(400, "Latitude and longitude are required");
        }


        const availableVehicles = await vehicleModel.aggregate([
            {
                // Calculate distance using GeoJSON index
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [lng, lat]  // [longitude, latitude]
                    },
                    distanceField: "distance_m",    // distance in meters
                    distanceDivisor: 1000,          // convert to KM
                    spherical: true,
                    query: { is_available: true }   // pre-filter before distance check
                }
            },
            {
                // Keep only vehicles within their own service_radius_km
                $match: {
                    $expr: { $lte: ["$distance_m", "$service_radius_km"] }
                }
            },
            {
                $addFields: {
                    distance_km: { $round: ["$distance_m", 2] }
                }
            },
            {
                $unset: "distance_m"  // clean up raw field
            }
        ]);

        if (!availableVehicles || availableVehicles.length === 0) {
            throw new ApiError(404, "No available vehicles in your area");
        }

        return res.status(200).json({ msg: "Available vehicles fetched", data: availableVehicles });

    }

    // Delete vehicle by ID
    static deleteVehicleById = async (req, res) => {
        const { id } = req.params;
        if (!id) {
            throw new ApiError(400, "Vehicle ID is required");
        }

        const deletedVehicle = await vehicleModel.findByIdAndDelete(id);
        if (!deletedVehicle) {
            throw new ApiError(404, "Vehicle not found or already deleted");
        }

        return res.status(200).json({ msg: "Vehicle deleted successfully", data: deletedVehicle });

    }


}


module.exports = VehicleController;