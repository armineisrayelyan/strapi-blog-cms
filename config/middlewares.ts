export default ({ env }) => {
  const useCloudinary = Boolean(env('CLOUDINARY_NAME'));

  const securityMiddleware = useCloudinary
    ? {
        name: 'strapi::security',
        config: {
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              'connect-src': ["'self'", 'https:'],
              'img-src': [
                "'self'",
                'data:',
                'blob:',
                'market-assets.strapi.io',
                'res.cloudinary.com',
              ],
              'media-src': [
                "'self'",
                'data:',
                'blob:',
                'market-assets.strapi.io',
                'res.cloudinary.com',
              ],
              upgradeInsecureRequests: null,
            },
          },
        },
      }
    : 'strapi::security';

  return [
    'strapi::logger',
    'strapi::errors',
    securityMiddleware,
    {
      name: 'strapi::cors',
      config: {
        origin: env.array('CORS_ORIGIN', ['http://localhost:3000']),
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
