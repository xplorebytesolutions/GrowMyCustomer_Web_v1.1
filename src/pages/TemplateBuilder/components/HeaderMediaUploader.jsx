import React, { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { uploadHeaderMedia } from "../../../api/templateBuilder/uploads";

export default function HeaderMediaUploader({
  draftId,
  language,
  mediaType,
  handle,
  onUploaded,
  onPreview,
}) {
  const [busy, setBusy] = useState(false);

  const onFile = async file => {
    if (!file) return;

    // Immediate local preview
    if (onPreview) {
      const url = URL.createObjectURL(file);
      onPreview(url);
    }

    setBusy(true);
    try {
      const data = await uploadHeaderMedia({
        draftId,
        language,
        mediaType,
        file,
      });

      if (data?.handle) {
        onUploaded?.(data.handle);
        toast.success("Media uploaded.");
      } else {
        toast.warn("Upload succeeded but no handle returned.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-colors">
        {busy ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Upload size={16} />
        )}
        <span className="text-sm font-medium">
          {busy ? "Uploading..." : "Choose file"}
        </span>
        <input
          type="file"
          className="hidden"
          accept={
            mediaType === "IMAGE"
              ? "image/*"
              : mediaType === "VIDEO"
              ? "video/*"
              : ".pdf,application/pdf"
          }
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting same file
            onFile(file);
          }}
        />
      </label>

      <div className="text-xs text-gray-500">
        {handle ? (
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            Media Attached
          </span>
        ) : (
          <span>No media selected</span>
        )}
      </div>
    </div>
  );
}
