import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Film,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { mediaService } from '../services/mediaService';

export const MediaUploader = ({ mediaList = [], onMediaChange }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const uploadedMedia = [...mediaList];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Basic format check
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          throw new Error(`File ${file.name} is not a supported image or video format.`);
        }

        // Max file size (50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the 50MB limit.`);
        }

        const result = await mediaService.uploadFile(file, (p) => setProgress(p));
        uploadedMedia.push(result);
      }

      onMediaChange(uploadedMedia);
    } catch (err) {
      setError(err.message || 'Failed to upload media to ImageKit');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (indexToRemove) => {
    const updated = mediaList.filter((_, idx) => idx !== indexToRemove);
    onMediaChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Media Assets ({mediaList.length})
        </label>
        <span className="text-xs text-slate-500">Supported: JPG, PNG, GIF, MP4, WebM (Max 50MB)</span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
          uploading
            ? 'border-emerald-500/40 bg-slate-950/70'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-200">
              Uploading to ImageKit... {progress}%
            </p>
            <div className="w-48 bg-slate-800 rounded-full h-1.5 mx-auto overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-xl bg-slate-800/80 text-emerald-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              Click or drag media here to upload
            </p>
            <p className="text-xs text-slate-500">
              Direct cloud upload to ImageKit storage
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Media Previews */}
      {mediaList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {mediaList.map((item, index) => (
            <div
              key={item.fileId || index}
              className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md"
            >
              {item.type === 'video' ? (
                <div className="w-full h-28 bg-slate-900 flex items-center justify-center text-slate-400">
                  <Film className="w-8 h-8 text-slate-500" />
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.fileName}
                  className="w-full h-28 object-cover"
                />
              )}

              <div className="p-2 text-[11px] text-slate-300 truncate bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                <span className="truncate mr-1">{item.fileName}</span>
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">
                  {item.type}
                </span>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMedia(index);
                }}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition"
                title="Remove Media"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
