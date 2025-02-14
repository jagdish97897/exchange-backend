export async function sendPushNotification(expoPushToken, title, body, data) {
    try {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        return { message: "Success" };
    } catch (error) {
        throw new Error('Error :', error.message);
    }
}