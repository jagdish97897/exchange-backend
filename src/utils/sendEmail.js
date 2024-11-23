// emailService.js

import { ses } from './sesConfig.js';

const sendEmail = (to, from, subject, body) => {
    const params = {
        Destination: {
            ToAddresses: [to]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: from,
    };

    return ses.sendEmail(params).promise();
};

export { sendEmail };
