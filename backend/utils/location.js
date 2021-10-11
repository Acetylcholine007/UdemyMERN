const { default: axios } = require("axios");

const HttpError = require("../models/http-error");

const API_KEY = "NONE";

async function getCoordsForAddress(address) {
  return { lat: 40, lng: -73 };

  //   const response = await axios.get(`${encodeURIComponent(address)} ${API_KEY}`);

  //   const data = response.data;

  //   if (!data || data.status === "ZERO_RESULTS") {
  //     const error = new HttpError(
  //       "Could not find location for the specified address.",
  //       422
  //     );
  //     throw error;
  //   }

  //   const coordinates = data.results[0].geometry.location;

  //   return coordinates;
}

module.exports = getCoordsForAddress;
