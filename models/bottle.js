const mongoose = require("mongoose");

const bottleSchema = new mongoose.Schema({
    sharedByUser: {
        type: String,
        required: true,
    },
    spotifyPlaylistId: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        maxlength: 140,
    },
    outAtSea: {
        type: Boolean,
        required: true,
        default: true,
    },
});

const Bottle = mongoose.model("Bottle", bottleSchema);

module.exports = Bottle;
