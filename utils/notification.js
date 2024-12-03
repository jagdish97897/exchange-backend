import nodemailer from "nodemailer";

export async function sendEmailNotification(notes) {
    // console.log('notes from notification', notes);

    const transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        secure: true,
        port: 465,
        // service: " GoDaddy",
        auth: {
            user: process.env.SENDER_EMAIL, // Update with your Gmail address
            pass: process.env.SENDER_PASSWORD, // Update with your Gmail password
        },
    });


    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: `${notes.email}`,
        subject: "New Registration Successful",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${notes.fullName},</p>

                <p>We are excited to have you join us! Your registration has been successfully completed. Below are the details you provided during the registration process:</p>

                <h3 style="color: #333;">Your Registration Details</h3>
                <p><strong>Name:</strong> ${notes.fullName}</p>
                <p><strong>Email:</strong> ${notes.email}</p>
                <p><strong>Phone No.:</strong> ${notes.phoneNumber}</p>

                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">

                <p>If you have any questions or need assistance, feel free to contact us at <a href="mailto:support@kgvl.co.in" style="color: #4CAF50;">support@kgvl.co.in</a>. We're here to help!</p>

                <p>Thank you for choosing KGVL. We look forward to making your experience exceptional!</p>

                <p style="color: #999; font-size: 12px;">&copy; 2024 KGVL. All rights reserved.</p>
            </div>

        `,

    };


    const mailOptions1 = {
        from: "team@kgvl.co.in",
        to: "sid@kgvl.co.in",
        subject: "New Customer Registration",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4CAF50;">New Customer Registration</h2>
                <p>A new customer has successfully registered. Below are their details:</p>
    
                <h3 style="color: #333;">Customer Information</h3>
                <p><strong>Full Name:</strong> ${notes.fullName}</p>
                <p><strong>Email:</strong> ${notes.email}</p>
                <p><strong>Phone No.:</strong> ${notes.phoneNumber}</p>
    
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
    
                <p style="color: #555;">Please review the details and update the system accordingly.</p>
    
                <p style="color: #999; font-size: 12px;">&copy; 2024 KGVL. All rights reserved.</p>
            </div>
        `,
    };



    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Email error: " + error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });

    // transporter.sendMail(mailOptions1, function (error, info) {
    //     if (error) {
    //         console.log("Email error: " + error);
    //     } else {
    //         console.log("Email sent: " + info.response);
    //     }
    // });
}