const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
// const router = express.Router();
const SpotifyWebApi = require("spotify-web-api-node");
const cors = require("cors");

const { searchforNextBottle, fetchBottle } = require("./functions");

scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-modify-public",
    "playlist-modify-private",
];

require("dotenv").config();

const User = require("./models/user");
const Bottle = require("./models/bottle");

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_API_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.CALLBACK_URL,
});

app.use(cors());

main().catch((err) => console.log(err));

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("accessed mongo");
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
    try {
        await spotifyApi.getMe();
        res.status(200).redirect("/app");
    } catch (e) {
        res.status(200).redirect("/login");
    }
});

app.get("/app", async (req, res) => {
    const spotifyUserId = await spotifyApi.getMe().then((res) => res.body.id);

    if (spotifyUserId) {
        let user = await User.findOne({
            spotifyUserId: spotifyUserId,
        });

        if (!user) {
            user = new User({ spotifyUserId: spotifyUserId });
            user.nextBottleDateTime = searchforNextBottle();
            await user.save();
        }

        if (user.nextBottleDateTime <= new Date()) {
            const fetchedBottle = await fetchBottle(user);
            if (!fetchedBottle) {
                res.status(200).render("bottle/index");
            } else {
                res.status(200).redirect(`found/${fetchedBottle._id}`);
            }
            user.nextBottleDateTime = searchforNextBottle();
            await user.save();
        } else {
            res.status(200).render("bottle/index");
        }
    }
});

app.get("/login", async (req, res) => {
    res.status(200).render("login/index");
});

app.post("/login", (req, res) => {
    const html = spotifyApi.createAuthorizeURL(scopes);
    res.status(200).redirect(html + "&show_dialog=true");
});

app.get("/callback", async (req, res) => {
    const { code } = req.query;
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token } = data.body;
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        res.status(200).redirect(`${process.env.SITE_URL}/app`);
    } catch (err) {
        res.status(200).redirect("/#/error/invalid token");
    }
});

app.post("/logout", async (req, res) => {
    await spotifyApi.resetCredentials();
    res.status(200).redirect("/login");
});

app.get("/account", async (req, res) => {
    try {
        const result = await spotifyApi.getMe();
        resstatus(200).render("account/index", { account: result.body });
    } catch (err) {
        res.status(400).send(err);
    }
});

app.get("/send", async (req, res) => {
    try {
        const playlists = await spotifyApi.getUserPlaylists({ limit: 50 });
        res.status(200).render("send/index", { playlists: playlists.body });
    } catch (err) {
        res.status(400).send(err);
    }
});

app.post("/send", async (req, res) => {
    const user = await spotifyApi.getMe().then((res) => res.body);

    const newBottle = new Bottle({ ...{ sharedByUser: user.id }, ...req.body });
    await newBottle.save();

    res.status(200).redirect(`sent/${newBottle.id}`);
});

app.get("/sent/:bottleId", async (req, res) => {
    const { bottleId } = req.params;
    const newBottle = await Bottle.findById(bottleId);
    const spotifyPlaylist = await spotifyApi
        .getPlaylist(newBottle.spotifyPlaylistId)
        .then((res) => res.body);
    const playlistTracks = await spotifyPlaylist.tracks.items.map((t) => {
        return t.track.id;
    });
    const trackObjects = await spotifyApi
        .getTracks(playlistTracks)
        .then((res) => res.body.tracks);

    res.status(200).render("bottle/sent", {
        bottle: newBottle,
        playlist: spotifyPlaylist,
        tracks: trackObjects,
        spotifyApi: spotifyApi,
    });
});

app.use("/found/:bottleId", async (req, res, next) => {
    const { bottleId } = req.params;
    const spotifyUserId = await spotifyApi.getMe().then((res) => res.body.id);
    const user = await User.findOne({
        spotifyUserId: spotifyUserId,
    });
    if (!user.currentlyHeldBottles.includes(bottleId)) next();
    const foundBottle = await Bottle.findById(bottleId);
    const spotifyPlaylist = await spotifyApi
        .getPlaylist(foundBottle.spotifyPlaylistId)
        .then((res) => res.body);
    const playlistTracks = await spotifyPlaylist.tracks.items.map((t) => {
        return t.track.id;
    });
    const trackObjects = await spotifyApi
        .getTracks(playlistTracks)
        .then((res) => res.body.tracks);

    res.status(200).render("bottle/found", {
        bottle: foundBottle,
        playlist: spotifyPlaylist,
        tracks: trackObjects,
        spotifyApi: spotifyApi,
    });
});

app.post("/found/:bottleId", async (req, res) => {
    const { bottleId } = req.params;
    const foundBottle = await Bottle.findById(bottleId);
    const spotifyPlaylist = await spotifyApi
        .getPlaylist(foundBottle.spotifyPlaylistId)
        .then((res) => res.body);
    const playlistTracks = await spotifyPlaylist.tracks.items.map((t) => {
        return t.track.id;
    });
    const trackObjects = await spotifyApi
        .getTracks(playlistTracks)
        .then((res) => res.body.tracks);

    foundBottle.outAtSea = true;
    await foundBottle.save();

    res.status(200).render("bottle/sent", {
        bottle: foundBottle,
        playlist: spotifyPlaylist,
        tracks: trackObjects,
        spotifyApi: spotifyApi,
    });
});

app.use((req, res) => {
    res.status(400).send("Not Found");
});

app.listen(8888, () => {
    console.log("running app");
});
