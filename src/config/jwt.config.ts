export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  signOptions: { expiresIn: '24h' },
};
