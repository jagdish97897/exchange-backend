import 'dotenv/config';
import axios from 'axios';

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

export { getLocation };