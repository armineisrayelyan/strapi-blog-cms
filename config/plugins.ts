export default ({ env }) => {
  const useCloudinary = Boolean(env('CLOUDINARY_NAME'));

  if (!useCloudinary) {
    return {};
  }

  return {
    upload: {
      config: {
        provider: 'cloudinary',
        providerOptions: {
          cloud_name: env('CLOUDINARY_NAME'),
          api_key: env('CLOUDINARY_KEY'),
          api_secret: env('CLOUDINARY_SECRET'),
        },
        actionOptions: {
          upload: {
            folder: env('CLOUDINARY_FOLDER', 'strapi-blog-cms'),
          },
          uploadStream: {
            folder: env('CLOUDINARY_FOLDER', 'strapi-blog-cms'),
          },
          delete: {},
        },
      },
    },
  };
};
