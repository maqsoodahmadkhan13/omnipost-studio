import axios from 'axios';
import api from '../lib/api';

export const mediaService = {
  // Fetch authentication parameters from backend
  getAuthParams: async () => {
    const res = await api.get('/media/auth');
    return res.data;
  },

  // Upload file to ImageKit
  uploadFile: async (file, onProgress) => {
    const authRes = await mediaService.getAuthParams();
    const authData = authRes.data;

    // Check if ImageKit is configured
    if (!authData.isConfigured) {
      // Mock upload for development/testing when keys not provided
      await new Promise((resolve) => setTimeout(resolve, 800));
      const objectUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      return {
        url: objectUrl,
        fileId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        type: isVideo ? 'video' : 'image'
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('publicKey', authData.publicKey);
    formData.append('signature', authData.signature);
    formData.append('expire', authData.expire);
    formData.append('token', authData.token);
    formData.append('folder', '/omnipost');

    const response = await axios.post(
      'https://upload.imagekit.io/api/v1/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        }
      }
    );

    const isVideo = file.type.startsWith('video/') || response.data.fileType === 'non-image';

    return {
      url: response.data.url,
      fileId: response.data.fileId,
      fileName: response.data.name,
      type: isVideo ? 'video' : 'image'
    };
  }
};
