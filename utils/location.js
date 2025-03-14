import 'dotenv/config';
import axios from 'axios';
import { S2 } from 's2-geometry';

const getLocation = async (req, res) => {
    const { fromPin, toPin } = req.body;

    if (!fromPin || !toPin) {
        return res.status(400).json({ success: false, message: "Both PIN codes are required." });
    }

    try {
        // Fetch geocodes for both PIN codes
        const geocode = async (pin) => {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                params: { address: pin, key: process.env.GOOGLE_MAPS_API_KEY },
            });
            const location = response.data.results[0]?.geometry?.location;
            if (!location) throw new Error(`Invalid PIN: ${pin}`);
            return location;
        };

        const startLocation = await geocode(fromPin);
        const endLocation = await geocode(toPin);

        // Fetch route between the two locations
        const routeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/directions/json`,
            {
                params: {
                    origin: `${startLocation.lat},${startLocation.lng}`,
                    destination: `${endLocation.lat},${endLocation.lng}`,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                },
            }
        );

        const path = routeResponse.data.routes[0]?.overview_polyline?.points;
        if (!path) throw new Error("Route not found.");

        // Decode polyline to lat/lng points
        const decodePolyline = (encoded) => {
            let points = [];
            let index = 0,
                len = encoded.length;
            let lat = 0,
                lng = 0;

            while (index < len) {
                let b,
                    shift = 0,
                    result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlat = result & 1 ? ~(result >> 1) : result >> 1;
                lat += dlat;

                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlng = result & 1 ? ~(result >> 1) : result >> 1;
                lng += dlng;

                points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
            }
            return points;
        };

        const pathCoordinates = decodePolyline(path);

        res.json({
            success: true,
            route: {
                startLocation,
                endLocation,
                path: pathCoordinates,
                initialRegion: {
                    latitude: (startLocation.lat + endLocation.lat) / 2,
                    longitude: (startLocation.lng + endLocation.lng) / 2,
                    latitudeDelta: Math.abs(startLocation.lat - endLocation.lat) + 0.1,
                    longitudeDelta: Math.abs(startLocation.lng - endLocation.lng) + 0.1,
                },
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getZoneFromGooglePlaces = async (latitude, longitude) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        const { results } = response.data;

        // console.log('Result :', results);

        if (results && results.length > 0) {
            let state = null;
            let country = null;

            // Loop through address components to find state and country
            for (const component of results[0].address_components) {
                if (component.types.includes("administrative_area_level_1")) {
                    state = component.long_name; // State (Zone)
                }
                if (component.types.includes("country")) {
                    country = component.short_name; // Country Code (IN for India)
                }
            }

            // Ensure the location is in India before returning the zone (state)
            if (country === "IN" && state) {
                return state;
            } else {
                return "Outside India";
            }
        }

        console.warn("No results found for latlng:", latitude, longitude);
        return "Unknown";
    } catch (error) {
        console.error("Error in reverse geocoding:", error);
        return "Unknown";
    }
};

// Helper function to convert lat/lng to S2 Cell ID at a given level
const getCellId = async (lat, lng, level = 13) => S2.latLngToKey(lat, lng, level);

const getDistance = async (req, res) => {
    const {lat1,lon1,lat2,lon2} = req.query;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await axios.get(url);
        let distance = '';
        if (response.data.status === 'OK') {
            distance = response.data.rows[0].elements[0].distance.text;
            console.log(`Distance: ${distance}`);
        } else {
            console.error('Error fetching distance:', response.data.error_message);
        }
        return res.status(200).json({ success: true, distance });
    } catch (error) {
        console.error('Error:', error.message);
    }
};


export { getLocation, getZoneFromGooglePlaces, getCellId, getDistance };
