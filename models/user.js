const mongoose = require("mongoose");
const { searchforNextBottle } = require("../functions");

const userSchema = new mongoose.Schema({
    // username: {
    //     type: String,
    //     maxlength: 15,
    //     required: true,
    // },
    spotifyUserId: {
        type: String,
        required: true,
    },
    // sharedBottles: [String],
    currentlyHeldBottles: [String],
    nextBottleDateTime: {
        type: Date,
        required: true,
    },
    // isNewUser: {
    //     type: Boolean,
    //     required: true,
    //     default: true,
    // },
});

userSchema.pre("save", async function () {
    if (!this.nextBottleDateTime) {
        this.nextBottleDateTime = searchforNextBottle();
    }
});

// userSchema.post("save", async function () {});

const User = mongoose.model("User", userSchema);

module.exports = User;
