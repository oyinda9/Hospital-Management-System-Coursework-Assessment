export const generateToken = (user, message, statusCode, res) => {
    const token = user.generateJsonWebToken();
    const cookieName = user.role === "Admin" ? "adminToken" : "patientToken";

    // Fix for D10: copy the user and remove the password hash, so it is never sent to the browser.
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(statusCode).cookie(cookieName, token, {
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // Fix for D3: in production the cookie is only sent over HTTPS (Secure flag).
        secure: process.env.NODE_ENV === "production",
    }).json({
        success: true,
        message,
        user: safeUser,
        // Fix for D3: the token is no longer returned in the JSON body. The frontends only use
        // the HttpOnly cookie (searching both frontends for "token" found no matches).
    })
}