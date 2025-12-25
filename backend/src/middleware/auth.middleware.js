import jwt from 'jsonwebtoken';
export const UserValidation = (req, res, next) => {
    const Header = req.headers.authorization;
    if (!Header) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = Header.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }

};