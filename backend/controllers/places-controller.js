const { v4: uuid } = require("uuid");
const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../utils/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Something went wrong. could not find a place",
      500
    );
    return next(newError);
  }

  if (!place) {
    return next(
      new HttpError("Could not find place for the provided id.", 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const uid = req.params.uid;
  let userWithPlaces;

  try {
    userWithPlaces = await User.findById(uid).populate("places");
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Something went wrong. could not find a place",
      500
    );
    return next(newError);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided id.", 404)
    );
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, plase check your data", 422)
    );
  }

  const { title, description, address, creator } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Creating place failed, please try again",
      500
    );
    return next(newError);
  }

  if (!user) {
    const error = new HttpError("Could not find user for the provided id", 404);
    return next(error);
  }
  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Creating place failed 2, please try again",
      500
    );
    return next(newError);
  }

  res.status(201).json({ createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, plase check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;

  try {
    place = await Place.findById(placeId);
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Something went wrong. could not find a place",
      500
    );
    return next(newError);
  }

  if (!place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place.", 401));
  }

  place.title = title;
  place.description = description;

  let result;
  try {
    result = await place.save();
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Creating place failed, please try again",
      500
    );
    return next(newError);
  }

  res.status(200).json({ place: place.toObject({ getters: true }), result });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Something went wrong. could not find a place",
      500
    );
    return next(newError);
  }

  if (!place) {
    return next(
      new HttpError("Could not find place for the provided id.", 404)
    );
  }

  if (places.creator.id !== req.userData.userId) {
    return next(new HttpError("You are not allow to delete this place.", 401));
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log(error);
    const newError = new HttpError(
      "Something went wrong, could not delete place",
      500
    );
    return next(newError);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place Deleted" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
