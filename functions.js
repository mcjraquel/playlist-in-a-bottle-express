const Bottle = require("./models/bottle");

function searchforNextBottle() {
    const startEpoch = Date.parse(new Date());
    const nextBottleInterval = Math.ceil(Math.abs(Math.random()) * 518400000);
    const nextBottleEpoch = startEpoch + nextBottleInterval;
    return new Date(nextBottleEpoch);
}

async function fetchBottle(user) {
    const bottleCount = await Bottle.countDocuments({ outAtSea: true });
    const random = Math.floor(Math.random() * bottleCount);
    const fetchedBottle = await Bottle.find({ outAtSea: true })
        .skip(random)
        .limit(1)
        .then((res) => res[0]);

    if (!fetchedBottle) return;

    fetchedBottle.outAtSea = false;
    await fetchedBottle.save();
    user.currentlyHeldBottles.push(fetchedBottle._id);
    await user.save();
    return fetchedBottle;
}

module.exports = { searchforNextBottle, fetchBottle };
