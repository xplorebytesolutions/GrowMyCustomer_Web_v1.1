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
}) {
  const [busy, setBusy] = useState(false);

  const onFile = async file => {
    if (!file) return;

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
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded border cursor-pointer hover:bg-gray-50">
        {busy ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Upload size={16} />
        )}
        <span className="text-sm">{busy ? "Uploading…" : "Choose file"}</span>
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
            e.target.value = ""; // ✅ allow re-selecting same file
            onFile(file);
          }}
        />
      </label>

      <div className="text-xs text-gray-600">
        {handle ? (
          <span>
            Handle: <code>{handle}</code>
          </span>
        ) : (
          <span>No media selected</span>
        )}
      </div>
    </div>
  );
}
